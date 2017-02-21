#!/usr/bin/python

import struct
import zlib
from shockabsorber.model.sections import Section, SectionMap
from shockabsorber.loader.util import SeqBuffer

class SectionMapImpl(SectionMap):  #------------------------------
    def __init__(self, entries):
        SectionMap.__init__(self, entries)
        entries_by_nr = {}
        for e in self.entries:
            entries_by_nr[e.nr] = e
        self.entries_by_nr = entries_by_nr

    def __contains__(self,nr):
        return nr in self.entries_by_nr

    def __getitem__(self,nr):
        if not (nr in self.entries_by_nr): return None
        return self.entries_by_nr[nr]

    def kv_iter(self):
        return self.entries_by_nr.iteritems()
#--------------------------------------------------

class CommonSectionImpl(Section):  #------------------------------
    def __init__(self,nr,tag,size):
        Section.__init__(self,tag,size)
        self.nr = nr
#--------------------------------------------------

class ZSectionImpl(CommonSectionImpl):  #------------------------------
    def __init__(self,nr,tag,size,offset, file):
        CommonSectionImpl.__init__(self,nr,tag,size)
        self.offset = offset
        self.file = file

    def read_bytes(self):
        file = self.file
        print "DB| read_bytes (ZSectionImpl #%d): 0x%x+0x%x" % (self.nr, self.offset, self.size)
        file.seek(self.offset)
        # xheader = file.read(8)
        # [tag,size] = struct.unpack('!4si', xheader)
        # if tag != self.tag:
        #     raise Exception("section header is actually %s, not %s as expected" % (tag, self.tag))
        comp_data = file.read(self.size)
        return zlib.decompress(comp_data)
#--------------------------------------------------

class LateSectionImpl(CommonSectionImpl):  #------------------------------
    def __init__(self,nr,tag,size):
        CommonSectionImpl.__init__(self,nr,tag,size)
        self.late_bytes = None

    def set_bytes(self,bytes):
        self.late_bytes = bytes

    def read_bytes(self):
        return self.late_bytes
#--------------------------------------------------

class UncompSectionImpl(CommonSectionImpl):  #------------------------------
    def __init__(self,nr,tag,size,offset, file):
        CommonSectionImpl.__init__(self,nr,tag,size)
        self.offset = offset
        self.file = file

    def read_bytes(self):
        print "DB| DCR read_bytes: @%d+%d" % (self.offset, self.size)
        file = self.file
        file.seek(self.offset)
        return file.read(self.size)
#--------------------------------------------------

class ABMPEntry:  #------------------------------
    def __init__(self,nr,tag,size,offset, repr_mode):
        self.nr = nr
        self.tag = tag
        self.size = size
        self.offset = offset
        self.repr_mode = repr_mode

    def __repr__(self):
        return "<ABMPEntry #%d '%s' @0x%x+0x%x mode=%d>" % (self.nr, self.tag, self.offset, self.size, self.repr_mode)
#--------------------------------------------------

def parse_abmp_section(blob, file):
    buf = SeqBuffer(blob)
    v1 = buf.unpackVarint()
    v2 = buf.unpackVarint()
    section_count = buf.unpackVarint()
    print("ABMP header: %s" % [v1,v2, section_count])

    #w1sum=0; w2sum=0; w3sum=0; w4sum=0
    csum=0; usum=0
    sections = []
    for i in range(section_count):
        id = buf.unpackVarint()
        offset = buf.unpackVarint() # offset
        comp_size = buf.unpackVarint() # size in file
        decomp_size = buf.unpackVarint() # size, decompressed
        repr_mode = buf.unpackVarint()
        [tag] = buf.unpack('<4s')
        tag = rev(tag)
        print("ABMP entry: %s" % ([id, tag,
                                   offset, comp_size, decomp_size,
                                   repr_mode]))
        sections.append(ABMPEntry(id, tag, comp_size, offset, repr_mode))

    print "Bytes left in ABMP section: %d" % buf.bytes_left()
    # print "Sums: %s" % [csum, usum]
    return sections
#--------------------------------------------------

def create_section_map(f, loader_context):
    while True:
        xsectheader = f.read(4)
        if len(xsectheader) < 4: break
        [stag] = struct.unpack('<4s', xsectheader)
        stag = rev(stag)
        ssize = read_varint(f)
        print "stag=%s ssize=%d" % (stag, ssize)
        if ssize==0:
            break
        else:
            sect_data = f.read(ssize)
        if stag == "Fcdr" or stag == "FGEI":
            sect_data = zlib.decompress(sect_data)
            print "ssize decompressed=%d" % (len(sect_data))
        elif stag == "ABMP":
            sect_data = zlib.decompress(sect_data[3:])
            print "ssize decompressed=%d" % (len(sect_data))
            abmp = parse_abmp_section(sect_data, f)
            print "DB| ABMP: %s" % abmp
        print "DB| %s -> %s" % (stag, sect_data)
    section_base_pos = f.tell()

    # entries_by_nr = {}
    # for e in abmp:
    #     entries_by_nr[e.nr] = e

    # Fetch the sections:
    sections = []
    sections_in_ils_by_nr = {}
    ils_section_bytes = None
    for e in abmp:
        snr = e.nr
        print "DB| section nr %s: %s" % (snr,e)
        if e.offset == -1:
            # Compressed, in ILS section.
            section = LateSectionImpl(snr,e.tag,e.size)
            sections_in_ils_by_nr[snr] = section
        elif e.repr_mode==0:
            section = ZSectionImpl(snr, e.tag, e.size,
                                   section_base_pos + e.offset, f)
        elif e.repr_mode==1:
            section = UncompSectionImpl(snr, e.tag, e.size, e.offset, f)
            # f.seek(section_base_pos + e.offset)
        
            # raw_sdata = f.read(e.size)
            # if e.repr_mode==0:
            #     sdata = zlib.decompress(raw_sdata)
            # elif e.repr_mode==1:
            #     sdata = raw_sdata
        else:
            raise "unknown repr_mode: %d" % e.repr_mode
            # entries_by_nr[snr] = (e.tag,sdata)
        sections.append(section)
        if e.tag=="ILS ":
            ils_section_bytes = section.bytes()

    if sections_in_ils_by_nr:
        read_ILS_section_into(ils_section_bytes,
                              sections_in_ils_by_nr,
                              sections)

    # print "Sections=%s" % (sections.keys())
    print "Sections:"
    for e in sections:
        print "  %d: %s" % (e.nr, e)

    # Debug:
    # for snr in sections:
    #     (tag,data) = sections[snr]
    #     if tag=="Lscr" or tag=="LctX":# or tag=="Lnam":
    #         print "DB| %d: %s->%s" % (snr, tag, data)
    #     if tag=="Lnam":
    #         print "DB| %d: %s->%s" % (snr, tag, LnamSection.parse(data))

    return SectionMapImpl(sections)

def read_ILS_section_into(ils_data, entries_by_nr, dest):
    buf = SeqBuffer(ils_data)
    while not buf.at_eof():
        nr = buf.unpackVarint()
        section = entries_by_nr[nr]
        data = buf.readBytes(section.size)
        section.set_bytes(data)

def rev(s):
    return s[::-1]

def read_varint(f):
    d = ord(f.read(1))
    if d<128:
        return d
    else:
        return ((d-128)<<7) + read_varint(f)
