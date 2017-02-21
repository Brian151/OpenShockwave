#### Purpose:
# Parse score-related sections.

from shockabsorber.loader.util import SeqBuffer
from shockabsorber.model.frames import FrameSequence, FrameDelta, FrameDeltaItem

def parse_frame_label_section(sections_map, loader_context):
    # Obtain section:
    vwlb_e = sections_map.entry_by_tag("VWLB")
    if vwlb_e == None: return None

    buf = SeqBuffer(vwlb_e.bytes())
    [nElems] = buf.unpack('>H')
    offset_table = []
    for i in range(nElems+1):
        [frame_nr, offset] = buf.unpack('>HH')
        offset_table.append((frame_nr, offset))
    base_pos = buf.tell()

    label_table = []
    for i in range(nElems):
        (frame_nr,offset1) = offset_table[i]
        (_       ,offset2) = offset_table[i+1]
        label = buf.pread_from_to(base_pos+offset1, base_pos+offset2)
        label_table.append((frame_nr, label))

    print "DB| Frame labels: %s" % label_table
    return label_table

def parse_score_section(sections_map, loader_context):
    # Obtain section:
    vwsc_e = sections_map.entry_by_tag("VWSC")
    if vwsc_e == None: return None

    # Parse header:
    buf = SeqBuffer(vwsc_e.bytes())
    [totalLength, v1, v2, count1a, count1b, size2] = buf.unpack('>6i')
    # Usually, v1=-3, v2=12, count1b=count1a+1.
    print "DB| Score section: counts=%s size=%s misc=%s" % ([count1a,count1b],[size2],[v1,v2])

    # Parse offset table:
    offsets = []
    for i in range(count1b):
        [offset] = buf.unpack('>i')
        offsets.append(offset)
    print "DB| Score section offsets=%s" % offsets

    base = buf.tell()
    def get_entry_bytes(idx):
        return buf.pread_from_to(base + offsets[idx], base + offsets[idx+1])

    # Parse entry index list:
    #print "DB| Score root primary raw: (len %d) <%s>" % (len(get_entry_bytes(0)), get_entry_bytes(0))
    print "DB| Score root tertiary raw: <%s>" % get_entry_bytes(2)
    (sprite_count, sprite_size, frame_table) = parse_score_entry_nr0(get_entry_bytes(0))
    entry_indexes = parse_score_entry_nr1(get_entry_bytes(1))
    print "DB| Occupied score entries (count=%d): %s" % (len(entry_indexes), entry_indexes)

    # Parse entries:
    table = []
    frame_scripts = []
    for nr,primary_idx in enumerate(entry_indexes):
        prim = get_entry_bytes(primary_idx)
        sec  = get_entry_bytes(primary_idx+1)
        tert = get_entry_bytes(primary_idx+2)

        primbuf = SeqBuffer(prim)
        [starttime,endtime,w3,w4,w5] = primbuf.unpack('>5i')
        [w6,w7,w8,w9,w10,w11,w12] = primbuf.unpack('>HiH4i')
        #print "DB| Score entry #%d@%d primary (len=%d): %s <%s>" % (nr, primary_idx, len(prim), [starttime, endtime, [w3,w4,w5,w6,w7,w8,w9,w10,w11,w12]], primbuf.peek_bytes_left())
        print "DB| Score entry #%d@%d secondary (len=%d): <%s>" % (nr, primary_idx, len(sec), sec)
        #print "DB| Score entry #%d@%d tertiary (len=%d): <%s>" % (nr, primary_idx, len(tert), tert)
        # if (i%3)==0 and len(entry)>0:
        #     buf2 = SeqBuffer(entry)
        #     [w1,w2,w3,w4,w5] = buf2.unpack('>5i')
        #     [w6,w7,w8,w9,w10,w11,w12] = buf2.unpack('>HiH4i')
        #     print "DB|   Primary (#%d): %d %d %d %d %d %s// <%s>" % (
        #         i, w1,w2,w3,w4,w5, [w6,w7,w8,w9,w10,w11,w12], repr(entry))
        # if (i%3)==1 and len(entry)>0:
        #     buf2 = SeqBuffer(entry)
        #     [w1,w2,w3] = buf2.unpack('>HHi')
        #     print "DB|   Secondary (#%d): %d %d %d // <%s>" % (
        #         i, w1,w2,w3, repr(entry))
        entry = (prim, sec, tert)

        scripts_in_frame = parse_frame_script_list(sec)
        frame_scripts.append(scripts_in_frame)
        table.append(entry)

    #return table
    return FrameSequence(sprite_count, sprite_size, frame_table, frame_scripts)

def parse_frame_script_list(blob):
    buf = SeqBuffer(blob)
    scripts = []
    while not buf.at_eof():
        [castlib_nr, member_nr, extra] = buf.unpack('>HHi')
        scripts.append(((castlib_nr, member_nr), extra))
    return scripts

def parse_score_entry_nr0(blob):
    buf = SeqBuffer(blob)
    [actualSize, c2, frameCount, c4, sprite_size, c6, v7] = buf.unpack('>3i4h')
    print "DB| Score root primary: header=%s" % [actualSize, c2, frameCount, c4, sprite_size, c6, v7]
    sprite_count = v7 + 6
    print "DB| Score root primary: extra=%s" % [c2, c4, c6, v7]
    #print "DB | Score root <primary: residue=<%s>" % (buf.buf[actualSize:],)
    buf = SeqBuffer(blob[buf.tell():actualSize])

    maxOffset = 0
    totItNr = 0
    deltas = []
    for frNr in range(1, frameCount+1):
        frNr += 1
        [frameDataLength] = buf.unpack('>H')
        frBuf = SeqBuffer(buf.readBytes(frameDataLength-2))
        #print "DB| Score root framedata raw=<%s>" % frBuf.buf

        delta_items = []
        itNr = 0
        while not frBuf.at_eof():
            itNr += 1; totItNr += 1
            [itemLength,offset] = frBuf.unpack('>HH')
            if offset > maxOffset: maxOffset = offset
            s = frBuf.readBytes(itemLength)
            delta_items.append(FrameDeltaItem(offset,s))
            #print "DB| Score framedata entry [%d][%d] (len %d): %d/0x%x, <%s>" % (frNr, itNr, itemLength, offset, offset, s)
        deltas.append(FrameDelta(delta_items))
    #print "DB| Score framedata = %s" % deltas
    #print "DB| Score framedata: maxOffset = %d (%d*48) chNr=%d totItNr=%d" % (maxOffset, maxOffset // 48, frNr, totItNr)
    return (sprite_count, sprite_size, deltas)

# Decode entry #1, which holds the list of used primary entries
# in order sorted by start-time.
def parse_score_entry_nr1(blob):
    buf = SeqBuffer(blob)
    [count] = buf.unpack('>i')
    table = []
    for i in range(count):
        [idx] = buf.unpack('>i')
        table.append(idx)
    return table
