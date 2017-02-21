
#### Purpose:
# Parse D*R files.
# Individual envelope formats are handled elsewhere (dxr_envelope etc.).

import struct
from shockabsorber.model.sections import Section, SectionMap, AssociationTable
from shockabsorber.model.cast import CastLibrary, CastLibraryTable
from shockabsorber.model.movie import Movie
from shockabsorber.loader.util import SeqBuffer, rev
from . import script_parser
from . import score_parser
import shockabsorber.loader.dxr_envelope
import shockabsorber.loader.dcr_envelope

class LoaderContext: #------------------------------
    """Contains information about endianness and file format version of a file."""
    def __init__(self, file_tag, is_little_endian):
        self.file_tag = file_tag
        self.is_little_endian = is_little_endian
#--------------------------------------------------

def parse_assoc_table(blob, loader_context):
    """ Takes a 'KEY*' section and returns an AssociationTable. """
    buf = SeqBuffer(blob, loader_context.is_little_endian)
    [v1,v2,nElems,nValid] = buf.unpack('>HHii', '<HHii')
    print("KEY* header: %s" % [v1,v2,nElems,nValid])
    # v1 = table start offset, v2 = table entry size?

    atable = AssociationTable()
    for i in range(nValid):
        [owned_section_id, composite_id] = buf.unpack('>ii', '<ii')
        tag = buf.readTag()
        castlib_assoc_id = composite_id >> 16
        owner_section_id = composite_id & 0xFFFF
        print "DB|   KEY* entry #%d: %s" % (i, [tag, owned_section_id, castlib_assoc_id, owner_section_id])
        if owner_section_id == 1024:
            atable.add_library_section(castlib_assoc_id, owned_section_id, tag)
        else:
            atable.add_cast_media(owner_section_id, owned_section_id, tag)
    return atable

def parse_cast_table_section(blob, loader_context):
    buf = SeqBuffer(blob)
    res = []
    while not buf.at_eof():
        (item,) = buf.unpack('>i')
        res.append(item)
    return res
#--------------------------------------------------

class CastMember: #------------------------------
    def __init__(self, section_nr, type, name, attrs, castdata):
        self.media = {}
        self.type = type
        self.name = name
        self.attrs = attrs
        self.section_nr = section_nr
        self.castdata = castdata

    def __repr__(self):
        return "<CastMember (@%d) type=%d name=\"%s\" attrs=%s meta=%s media=%s>" % \
            (self.section_nr, self.type, self.name, self.attrs, self.castdata, self.media)

    def add_media(self,tag,data):
        self.media[tag] = data

    def get_name(self): return self.name

    @staticmethod
    def parse(blob,snr, loader_context):
        buf = SeqBuffer(blob)
        [type,common_length,v2] = buf.unpack('>3i')
        common_blob = buf.readBytes(common_length)
        buf2 = SeqBuffer(common_blob)
        [v3,v4,v5,v6,cast_id,nElems] = buf2.unpack('>5iH')
        offsets = []
        for i in range(nElems+1):
            [tmp] = buf2.unpack('>i')
            offsets.append(tmp)

        blob_after_table=buf2.peek_bytes_left()
        attrs = []
        for i in range(len(offsets)-1):
            attr = blob_after_table[offsets[i]:offsets[i+1]]
            print "DB|   Cast member attr #%d: <%s>" % (i, attr)
            attrs.append(attr)

        if len(attrs)>=2 and len(attrs[1])>0:
            name = SeqBuffer(attrs[1]).unpackString8()
        else:
            name = None

        print "DB| Cast-member common: name=\"%s\"  attrs=%s  misc=%s" % (
            name, attrs, [v2,v3,v4,v5,v6, cast_id])
        noncommon = buf.peek_bytes_left()

        castdata = CastMember.parse_castdata(type, cast_id, SeqBuffer(noncommon), attrs)
        res = CastMember(snr,type, name, attrs, castdata)
        return res

    @staticmethod
    def parse_castdata(type, cast_id, buf, attrs):
        if type==1:
            return ImageCastType.parse(buf)
        elif type==11:
            return ScriptCastType.parse(buf, cast_id)
        else:
            return ("Unknown cast type", cast_id, attrs, buf.peek_bytes_left())

class CastType: #--------------------
    def __repr__(self):
        return "<%s%s>" % (self.__class__.__name__, self.repr_extra())

    def repr_extra(self): return ""

class ImageCastType(CastType): #--------------------
    def __init__(self, dims, total_dims, anchor, bpp, misc):
        self.dims = dims
        self.total_dims = total_dims
        self.anchor = anchor
        self.bpp = bpp # Bits per pixel
        print "DB| ImageCastType: misc=%s\n  dims=%s total_dims=%s anchor=%s" % (misc, dims, total_dims, anchor)
        self.misc = misc

    def repr_extra(self):
        return " dims=%s anchor=%s bpp=%d misc=%s" % (
            self.dims, self.anchor, self.bpp, self.misc)

    def get_anchor(self): return self.anchor

    @staticmethod
    def parse(buf):
        [v10,v11, height,width,v12,v13,v14, anchor_x,anchor_y,
         v15,bits_per_pixel,v17
        ] = buf.unpack('>Hi HH ihh hh bbi')
        total_width = v10 & 0x7FFF
        v10 = "0x%x" % v10
        v12 = "0x%x" % v12
        print "DB| ImageCastType.parse: ILE=%s %s" % (buf.is_little_endian, [(width, height), (total_width,height), bits_per_pixel])
        misc = ((v10,v11), (v12,v13,v14), (v15,v17))
        return ImageCastType((width, height),
                             (total_width,height),
                             (anchor_x, anchor_y),
                             bits_per_pixel,
                             misc)

#--------------------------------------------------

class ScriptCastType(CastType): #--------------------
    def __init__(self, id, misc):
        self.id = id
        self.misc = misc
        print "DB| ScriptCastType: id=#%d misc=%s" % (id, misc)

    def repr_extra(self):
        return " id=#%d misc=%s" % (self.id, self.misc)

    @staticmethod
    def parse(buf, script_id):
        [v30] = buf.unpack('>H')
        misc = [v30]
        return ScriptCastType(script_id, misc)

#--------------------------------------------------

class Media: #------------------------------
    def __init__(self,snr,tag,data):
        self.snr = snr
        self.data = data
        self.tag = tag

    def __repr__(self):
        return "<%s (@%d)%s>" % (self.__class__.__name__, self.snr,
                                 self.repr_extra())

    def repr_extra(self): return ""

    @staticmethod
    def parse(snr,tag,blob):
        if tag=="BITD":
            return BITDMedia(snr,tag,blob)
        else:
            return Media(snr,tag,blob)

class BITDMedia(Media): #------------------------------
    def __init__(self,snr,tag,blob):
        Media.__init__(self,snr,tag,blob)
        buf = SeqBuffer(blob)
        "TODO"
#--------------------------------------------------

def load_movie(filename):
    with open(filename) as f:
        (loader_context, sections_map, castlibs, castidx_order) = load_file(f)

        script_ctx = script_parser.create_script_context(sections_map, loader_context)
        frame_labels = score_parser.parse_frame_label_section(sections_map, loader_context)
        score = score_parser.parse_score_section(sections_map, loader_context)

        return Movie(castlibs=castlibs, frames=score, scripts="TODO")

def load_cast_library(filename):
    print "DB| load_cast_library: filename=%s" % filename
    with open(filename) as f:
        (loader_context, sections_map, castlibs, castidx_order) = load_file(f)

        # TODO script_ctx = script_parser.create_script_context(sections_map, loader_context)
        print "DB| load_cast_library: filename=%s" % filename
        return castlibs.get_cast_library(0)

def load_file(f):
    xheader = f.read(12)
    [magic,size,tag] = struct.unpack('!4si4s', xheader)

    is_little_endian = (magic == "XFIR")
    if is_little_endian:
        tag = rev(tag)
        magic = rev(magic)
    if magic != "RIFX":
        raise Exception("Bad file type")

    loader_context = LoaderContext(tag, is_little_endian)
    print "DB| Loader context: %s / %s" % (tag, is_little_endian)
    if (tag=="MV93"):
        sections_map = shockabsorber.loader.dxr_envelope.create_section_map(f, loader_context)
    elif (tag=="FGDM"):
        sections_map = shockabsorber.loader.dcr_envelope.create_section_map(f, loader_context)
    else:
        raise Exception("Bad file type")

    (castlibs, assoc_table) = read_singletons(sections_map, loader_context)
    populate_cast_libraries(castlibs, assoc_table, sections_map, loader_context)

    # for e in sections_map.entries:
    #     tag = e.tag
    #     if tag=="STXT" or tag=="Sord" or tag=="XMED" or tag=="VWSC" or tag=="VWFI" or tag=="VWLB" or tag=="SCRF" or tag=="DRCF" or tag=="MCsL" or tag=="Cinf":
    #         print "section bytes for %s (len=%d): <%s>" % (tag, len(e.bytes()), e.bytes())
    castorder_section_id = assoc_table.get_library_sections(0).get("Sord")
    if castorder_section_id == None:
        castidx_order = None
    else:
        castorder_e = sections_map[castorder_section_id]
        castidx_order = parse_cast_order_section(castorder_e.bytes(), loader_context)
        for i,k in enumerate(castidx_order):
            (clnr, cmnr) = k
            print "DB| Cast order #%d: %s -> %s" % (i, k, castlibs.by_nr[clnr].castmember_table[cmnr-1])

    return (loader_context, sections_map, castlibs, castidx_order)

def read_singletons(sections_map, loader_context):
    mcsl_e = sections_map.entry_by_tag("MCsL")
    castlib_table = (CastLibraryTable([CastLibrary(0,None,None,0,None,1024)]) if mcsl_e==None else
                     parse_cast_lib_section(mcsl_e.bytes(), loader_context))

    keys_e = sections_map.entry_by_tag("KEY*")
    assoc_table = parse_assoc_table(keys_e.bytes(), loader_context)

    return (castlib_table, assoc_table)

def populate_cast_libraries(castlibs, assoc_table, sections_map, loader_context):
    for cl in castlibs.iter_by_nr():
        # Read cast list:
        assoc_id = cl.assoc_id
        if assoc_id==0 and cl.name<>None: continue
        print "DB| populate_cast_libraries: sections: %s" % (assoc_table.get_library_sections(assoc_id),)
        castlist_section_id = assoc_table.get_library_sections(cl.assoc_id).get("CAS*")
        if castlist_section_id==None: continue
        print "DB| populate_cast_libraries: CAS*-id=%d" % (castlist_section_id,)
        castlist_e = sections_map[castlist_section_id]

        cast_idx_table = parse_cast_table_section(castlist_e.bytes(), loader_context)
        print "DB| populate_cast_libraries: idx_table=%s" % (cast_idx_table,)

        def section_nr_to_cast_member(nr):
            if nr==0: return None
            cast_section = sections_map[nr].bytes()
            castmember = CastMember.parse(cast_section,nr, loader_context)
            populate_cast_member_media(castmember, cl.assoc_id, nr,
                                       assoc_table, sections_map)
            return castmember
        cast_table = map(section_nr_to_cast_member, cast_idx_table)
        print "DB| populate_cast_libraries: cast_table=%s" % (cast_table,)
        cl.set_castmember_table(cast_table)

def populate_cast_member_media(castmember, castlib_assoc_id, castmember_section_id, assoc_table, sections_map):
    medias = assoc_table.get_cast_media(castmember_section_id)
    print "DB| populate_cast_member_media: %d,%d -> %s" % (castlib_assoc_id,castmember_section_id,medias)
    for tag,media_section_id in medias.iteritems():
        media_section_e = sections_map[media_section_id]
        if media_section_e == None: continue
        # TODO: Load media more lazily.
        media_section = media_section_e.bytes()
        media = Media.parse(media_section_id, tag, media_section)
        castmember.add_media(tag, media)

def parse_cast_lib_section(blob, loader_context):
    # Read header:
    buf = SeqBuffer(blob)
    [v1,nElems,ofsPerElem,nOffsets,v5] = buf.unpack('>iiHii')
    print "DB| Cast lib section header: nElems=%d, nOffsets=%d, ofsPerElem=%d, misc=%s" % (nElems, nOffsets, ofsPerElem, [v1,v5])

    # Read offset table:
    offsets = []
    for i in range(nOffsets):
        [offset] = buf.unpack('>i')
        offsets.append(offset)
    base = buf.tell()
    #print "DB| Cast lib section: offsets=%s" % offsets

    offnr = 0
    table = []
    for enr in range(nElems):
        entry = []
        for i in range(ofsPerElem):
            subblob = buf.buf[base + offsets[offnr]:base + offsets[offnr+1]]
            offnr += 1
            #print "DB|   i=%d subblob=<%s>" % (i,subblob)
            buf2 = SeqBuffer(subblob)
            if i==0:
                item = buf2.unpackString8()
            elif i==1:
                if buf2.bytes_left()>0:
                    item = buf2.unpackString8()
                else:
                    item = None
            elif i==2:
                [item] = buf2.unpack('>h')
            elif i==3:
                [w1,w2,w3,w4] = buf2.unpack('>hhhh')
                item = (w1,w2,w3,w4)
            else:
                item = subblob
            entry.append(item)
        print "DB| Cast lib table entry #%d: %s" % (enr+1,entry)
        [name, path, _zero, (low_idx,high_idx, assoc_id, self_idx)] = entry
        table.append(CastLibrary(enr+1, name, path, assoc_id, (low_idx,high_idx), self_idx))

    return CastLibraryTable(table)

def parse_cast_order_section(blob, loader_context):
    print "DB| parse_cast_order_section..."
    buf = SeqBuffer(blob, loader_context)
    [_zero1, _zero2, nElems, nElems2, v5] = buf.unpack('>5i')
    print "DB| parse_cast_order_section: header: %s" % ([_zero1, _zero2, nElems, nElems2, v5],)
    table = []
    for i in range(nElems):
        [castlib_nr, castmember_nr] = buf.unpack('>HH')
        print "DB| parse_cast_order_section #%d: %s" % (i, (castlib_nr,castmember_nr))
        table.append((castlib_nr,castmember_nr))
    return table
