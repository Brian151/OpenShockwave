
#### Purpose:
# Parse and create section map for DXR files.
#

import struct
from shockabsorber.model.sections import Section, SectionMap
from shockabsorber.loader.util import SeqBuffer

def create_section_map(f, loader_context):
    return find_and_read_section(f, "mmap", loader_context)

def find_and_read_section(f, tag_to_find, loader_context):
    while True:
        xheader = f.read(8)
        buf = SeqBuffer(xheader, loader_context.is_little_endian)
        tag = buf.readTag()
        [size] = buf.unpack('>i', '<i')

        print("  tag=%s" % tag)
        if tag==tag_to_find:
            blob = f.read(size)
            return parse_mmap_section(blob, f, loader_context)
        else:
            f.seek(size, 1)

def parse_mmap_section(blob, file, loader_context):
    buf = SeqBuffer(blob, loader_context.is_little_endian)
    [v1,v2,nElems,nUsed,junkPtr,v3,freePtr] = buf.unpack('>HHiiiii', '<HHiiiii')
    print("mmap header: %s" % [v1,v2,nElems,nUsed,junkPtr,v3,freePtr])

    sections = []
    for i in range(nUsed):
        tag = buf.readTag()
        [size, offset, w1,w2, link] = buf.unpack('>IIhhi', '<IIhhi')
        #print("mmap entry: %s" % [tag, size, offset, w1,w2, link])
        if tag=="free" or tag=="junk":
            section = NullSection(tag)
        else:
            section = SectionImpl(tag, size, offset, file, loader_context)
        sections.append(section)
    return SectionMap(sections)


class SectionImpl(Section):  #------------------------------
    def __init__(self,tag,size,offset, file, loader_context):
        Section.__init__(self,tag,size)
        self.offset = offset
        self.file = file
        self.loader_context = loader_context

    def read_bytes(self):
        file = self.file
        file.seek(self.offset)
        xheader = file.read(8)
        buf = SeqBuffer(xheader, self.loader_context.is_little_endian)
        tag = buf.readTag()
        #[dummy_size] = buf.unpack('>i', '<i')
        if tag != self.tag:
            raise Exception("section header is actually %s, not %s as expected" % (tag, self.tag))
        return file.read(self.size)
#--------------------------------------------------

class NullSection(Section):  #------------------------------
    def __init__(self,tag):
        Section.__init__(self,tag,-1)

    def read_bytes(self):
        return None
#--------------------------------------------------
