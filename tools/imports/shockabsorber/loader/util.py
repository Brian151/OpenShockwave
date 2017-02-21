
#### Purpose:
# Utilities for binary parsing.
#

import struct

class SeqBuffer:  #------------------------------
    def __init__(self,src, is_little_endian=False):
        self.buf = buffer(src)
        self.offset = 0
        self.is_little_endian = is_little_endian

    def readTag(self):
        tag = self.readBytes(4)
        if self.is_little_endian:
            tag = rev(tag)
        return tag

    def unpack(self,be_fmt, le_fmt=None):
        if le_fmt==None: le_fmt = be_fmt
        if self.is_little_endian:
            fmt = le_fmt
        else:
            fmt = be_fmt
        if isinstance(fmt,str): fmt=struct.Struct(fmt) # sic
        res = fmt.unpack_from(self.buf, self.offset)
        self.offset += fmt.size
        return res

    def unpackString8(self):
        [len] = self.unpack('B')
        str = self.buf[self.offset:self.offset+len]
        self.offset += len
        return str

    def unpackVarint(self):
        acc = 0
        while True:
            d = ord(self.buf[self.offset])
            #print "DB| unpackVarint: %d" % d
            self.offset += 1
            acc = (acc<<7) | (d & 0x7F)
            if d<128:
                if acc > 0x80000000: acc -= 0x100000000 # Convert to sint32
                return acc

    def readBytes(self, len):
        bytes = self.buf[self.offset:self.offset+len]
        self.offset += len
        return bytes

    def tell(self):
        return self.offset

    def seek(self,new_offset):
        self.offset = new_offset

    def pread_from_to(self, frm, to):
        return self.buf[frm:to]

    def bytes_left(self):
        return len(self.buf) - self.offset

    def peek_bytes_left(self):
        return self.buf[self.offset:]

    def at_eof(self):
        return self.offset >= len(self.buf)
#--------------------------------------------------

def rev(s):
     return s[::-1]

def half_expect(actual_value, expected_value, name):
    if actual_value != expected_value:
        print "Surprised: %s is not %s but %s." % (name, expected_value, actual_value)

int_struct = struct.Struct('>i')
double_struct = struct.Struct('>d')
