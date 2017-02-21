#### Purpose:
# All script-related file parsing.
#

from .util import SeqBuffer, rev, half_expect, int_struct, double_struct
from shockabsorber.model.scripts import ScriptNames

def create_script_context(mmap, loader_context):
    lctx_e = mmap.entry_by_tag("LctX")
    if lctx_e == None: return (None,None)
    (lnam_sid, lscr_sids) = parse_lctx_section(lctx_e.bytes())

    lnam_e = mmap[lnam_sid]
    names = parse_lnam_section(lnam_e.bytes())
    print "DB| script names: %s" % names
    print "DB| lscr_sids=%s" % (lscr_sids,)
    scripts = map(lambda sid: parse_lscr_section(sid,mmap[sid].bytes(), names),
                  lscr_sids)
    return (names,scripts)

def parse_lctx_section(blob):
    buf = SeqBuffer(blob)
    [v1, v2, nEntries, nEntries2] = buf.unpack('>4i') # Usually v1=v2=0
    [offset,v4] = buf.unpack('>2h') # Usually offset=96, v4=12
    [v5,v6,v7,lnam_section_id,validCnt,flags10,freePtr] = buf.unpack('>4i3h') # Usually v5=0, v6=1/3, v7=-1
    print "DB| LctX entry_count=%d/%d valid_count=%d offset=%d freePtr=%d" % (nEntries, nEntries2, validCnt, offset, freePtr)
    print "DB| LctX names: section #%d" % (lnam_section_id,)
    print "DB| LctX extras: %s" % ([[v1,v2], [v4,v5,v6,v7,flags10]],)

    def read_entry():
        [w1, section_id, w2,w3] = buf.unpack('>ii2h')
        print "DB|   LctX section entry: %s" % ([w1,section_id,w2,w3],)
        return section_id

    movie_handler_names = parse_handler_nr_vector(buf.buf[buf.tell() : offset], 27)
    print "DB| LctX movie handlers: %s" % movie_handler_names

    buf.seek(offset)
    lscr_sections = []
    for i in range(nEntries):
        sid = read_entry()
        if sid != -1: lscr_sections.append(sid)

    return (lnam_section_id, lscr_sections)

def parse_lnam_section(blob):
    buf = SeqBuffer(blob)
    [v1,v2,len1,len2,v3,numElems] = buf.unpack(">iiiiHH")
    names = []
    for i in range(numElems):
        names.append(buf.unpackString8())
    name_map = {} # For better printing
    for i in range(numElems):
        name_map[i] = names[i]
    return ScriptNames(names, [v1,v2,len1,len2,v3])
#--------------------------------------------------

def parse_lscr_section(snr, blob, names):
    print "DB| Lscr section #%d:" % (snr,)
    buf = SeqBuffer(blob)
    [v1,v2,totalLength,totalLength2,
     header_length, script_id, count2] = buf.unpack('>4i3H')
    [v3,v4,v5,v6,v7,v8,v9,v10,hvec_length] = buf.unpack('>6ihhh')
    [hvec_offset, flags56, props_count, props_offset, globs_count, globs_offset] = buf.unpack('>iiHiHi')
    [handler_count, handler_offset] = buf.unpack('>Hi')
    [literal_count, literal_offsets_offset, literals_length, literals_offset] = buf.unpack('>Hiii')
    half_expect(v1, 0, "Lscr.v1")
    half_expect(v2, 0, "Lscr.v2")
    half_expect(totalLength2, totalLength, "Lscr.totalLength2")
    half_expect(header_length, 92, "Lscr.header_length")
    #half_expect(v1, 0, "Lscr.v1")
    print "DB| Lscr extras: %s" % ([[v1,v2,totalLength,totalLength2],
                                    [header_length,script_id,count2],
                                    [v3,v4,v5,v6,v7,v8,v9,v10],
                                    [flags56]],)
    print "DB| Lscr offsets: %s" % ([header_length, props_offset, globs_offset, handler_offset, literal_offsets_offset, literals_offset, hvec_offset, totalLength, len(buf.buf)],)
    print "DB|   parts: %s" % ([("props",props_count,props_offset,props_offset+2*props_count),
                                ("globs",globs_count,globs_offset,globs_offset+2*globs_count),
                                ("handlers",handler_count, handler_offset, handler_offset+46*handler_count),
                                ("literal-offsets", literal_count, literal_offsets_offset, literal_offsets_offset+8*literal_count),
                                ("literals", literal_count, literals_length, literals_offset, literals_offset + literals_length),
                                ("hvector", hvec_length, hvec_offset, hvec_offset+2*hvec_length),
                                ("end", totalLength)],)

    ## String offsets table:
    buf5 = SeqBuffer(buf.buf[literal_offsets_offset : literals_offset])
    res5 = []
    while not buf5.at_eof():
        [tmpa,tmpb] = buf5.unpack('>ii')
        res5.append((tmpa,tmpb))
    print "DB| LcxT res5 (len=%d) = %s" % (len(res5), res5)

    print "DB| handler vector: %s" % (parse_handler_nr_vector(buf.buf[hvec_offset : hvec_offset+2*hvec_length], hvec_length),)

    print "DB| literal_count = %d handler_count = %d" % (literal_count,handler_count)

    global_names = parse_lscr_varnames_table(subblob(blob, (globs_offset, globs_count), 2), globs_count, names)
    property_names = parse_lscr_varnames_table(subblob(blob, (props_offset, props_count), 2), props_count, names)
    literals = parse_lscr_literals(subblob(blob,(literal_offsets_offset, literal_count), 8),
                                   subblob(blob,(literals_offset,literals_length)),
                                   literal_count)
    print "DB| Lscr.globals: %s" % (dict(enumerate(global_names)),)
    print "DB| Lscr.properties: %s" % (dict(enumerate(property_names)),)
    print "DB| Lscr.literals: %s" % (dict(enumerate(literals)),)
    handlers_meta = parse_lscr_handler_table(subblob(blob, (handler_offset, 46*handler_count)),
                                             handler_count, names)
    for h in handlers_meta:
        [name, code_slice, argnames_slice,
         localnames_slice, auxslice2, lines_slice, misc] = h
        arg_names = parse_lscr_varnames_table(subblob(blob, argnames_slice, 2), argnames_slice[1],
                                             names)
        local_names = parse_lscr_varnames_table(subblob(blob, localnames_slice, 2), localnames_slice[1],
                                             names)
        aux2 = subblob(blob, auxslice2)
        lines_blob = subblob(blob, lines_slice)
        code_blob = subblob(blob, code_slice)
        print "DB| handler %s:\n    code-bin=<%s>\n    vars=%s\n    locals=%s\n    linetable=%s\n    aux=<%s>" % (
            name, code_blob, arg_names, local_names, lines_blob, aux2)
        code = parse_lscr_code(code_blob, names, literals, arg_names, local_names)
        print "DB| handler %s:\n    code=%s" % (name, code)
    return (literals,"TODO")

def parse_lscr_literals(table_blob, data_blob, count):
    #print "DB| String literals:"
    #print "DB|   count: %d  src: <%s> / <%s>" % (count,table_blob,data_blob)
    buf = SeqBuffer(table_blob)
    res = []
    for i in range(count):
        [type,offset] = buf.unpack('>ii')
        #print "DB|   parse_lscr_string_literals: #%d: type=%d offset=%d" % (i,type,offset)
        [length] = int_struct.unpack_from(data_blob, offset)
        data = data_blob[offset+4 : offset+4+length]
        if type==1: # String
            lit = data
            if length>0 and lit[length-1] == '\0':
                # Remove NUL terminator
                lit=lit[:length-1]
            # TODO: wrap
        elif type==9: # Double
            [lit] = double_struct.unpack(data)
            # TODO: wrap
        else:
            print "DB| Unknown literal type %d!" % (type,)
            lit = None
        #print "DB|   #%d/%d: \"%s\"" % (i,count,s)
        res.append(lit)
    return res

def parse_lscr_handler_table(blob, count, names):
    buf = SeqBuffer(blob)
    res = []
    for i in range(count):
        [handler_name_nr, handler_nr, code_length, code_offset] = buf.unpack('>hhii')
        [argname_count, argnames_offset,
         localname_count, localnames_offset,
         length7, offset7, v8] = buf.unpack('>hihihii')
        [v10, lines_count, lines_offset, v13] = buf.unpack('>hhii')

        handler_name = names[handler_name_nr]
        print "DB| * handler_name = '%s' (0x%x)" % (handler_name, handler_name_nr)
        print "DB|   subsections = %s" % ([(code_offset, code_length),
                                           (argnames_offset, argname_count),
                                           (localnames_offset, localname_count),
                                           (offset7, length7),
                                           (lines_offset, lines_count)],)
        print "DB|   handler extras = %s" % ([v8, v10, v13],)
        misc = [handler_nr, v8, v10, v13]
        res.append((handler_name,
                    (code_offset, code_length),
                    (argnames_offset, argname_count),
                    (localnames_offset, localname_count),
                    (offset7, length7),
                    (lines_offset, lines_count),
                    misc))
    return res

def parse_lscr_varnames_table(blob, count, names):
    buf = SeqBuffer(blob)
    res = []
    for i in range(count):
        [name_nr] = buf.unpack('>h')
        res.append(names[name_nr])
    return res

OPCODE_SPEC = {
    0x01: ("Return", []),
    0x03: ("Push-int-0", []),
    0x04: ("Multiply", []),
    0x05: ("Add", []),
    0x06: ("Subtract", []),
    0x07: ("Divide", []),
    0x09: ("Negate", []),
    0x0a: ("Concat-strings", []),
    0x0b: ("Concat-strings-with-space", []),
    0x0c: ("Less-than?", []),
    0x0e: ("Not-equals", []),
    0x0d: ("Less-than-or-equals", []),
    0x0f: ("Equals", []),

    0x10: ("Greater-than", []),
    0x11: ("Greater-than-or-equals", []),
    0x12: ("AND(OR)?", []),
    0x13: ("OR(AND)?", []),
    0x14: ("NOT?", []),
    0x15: ("String-contains", []),
    0x1e: ("Construct-linear-array", []),
    0x1f: ("Construct-assoc-array", []),

    0x21: ("Swap", []),

    # Some instructions exist in an 8-bit and a 16-bit version.
    # Usually, the difference between the two opcodes is 0x40.

    0x41: ("Push-int", ['int8']),       0xae: ("Push-int", ['int16']),
    0x42: ("Set-arg-count-void", ['int8']),
    0x43: ("Set-arg-count-return", ['int8']),
    0x44: ("Push-string", ['str8']),
    0x45: ("Push-symbol", ['sym8']),    0x85: ("Push-symbol", ['sym16']),
    0x49: ("Push-global", ['sym8']),    0x89: ("Push-global", ['sym16']),
    0x4a: ("Push-property", ['sym8']),  0x8a: ("Push-property", ['sym16']),
    0x4b: ("Push-parameter", ['argvar8']),
    0x4c: ("Push-local", ['locvar8']),

    0x4f: ("Store-global", ['sym8']),   0x8f: ("Store-global", ['sym16']),

    0x50: ("Store-property", ['sym8']), 0x90: ("Store-property", ['sym16']),
    0x51: ("Store-parameter", ['argvar8']),
    0x52: ("Store-local", ['locvar8']),

                                        0x93: ("Jump-relative", ['rel16']),
    0x54: ("Jump-relative-back", ['relb8']), 0x94: ("Jump-relative-back", ['relb16']),
                                        0x95: ("Jump-relative-unless", ['rel16']),

    0x56: ("Call-local", ['int8']),
    0x57: ("Call", ['sym8']),           0x97: ("Call", ['sym16']),
    0x5c: ("Get-unnamed-builtin", ['int8']),
    0x5f: ("Get-the", ['sym8']),        0x9f: ("Get-the", ['sym16']),

    0x60: ("Store-system-property?", ['sym8']),
    0x61: ("Get-field", ['sym8']),      0xa1: ("Get-field", ['sym16']),
    0x62: ("Put-field", ['sym8']),      0xa2: ("Put-field", ['sym16']),

    0x64: ("Dup", ['int8']),
    0x65: ("Pop", ['int8']),
    0x66: ("Call-system-getter", ['sym8']), 0xa6: ("Call-system-getter", ['sym16']), # 'the'
    0x67: ("Call-method", ['sym8']),    0xa7: ("Call-method", ['sym16']),
    #0x6d: () -> number

    0x70: ("Get-special-field", ['sym8']), 0xb0: ("Get-special-field", ['sym16']),
    0xef: ("Push-int-32?", ['int32']),
    0xf1: ("Push-float", ['float32']),
}

def parse_lscr_code(blob, names, strings, arg_names, local_names):
    print "DB| handler code blob (length %d): <%s>" % (len(blob), blob)
    buf = SeqBuffer(blob)
    res = []
    while not buf.at_eof():
        codepos = buf.offset
        [opcode] = buf.unpack('B')
        if opcode in OPCODE_SPEC:
            (opcode,argspec) = OPCODE_SPEC[opcode]
            args = []
            for a in argspec:
                if a=='int8':
                    [arg] = buf.unpack('b')
                elif a=='str8':
                    [arg] = buf.unpack('B')
                    arg = strings[arg]
                elif a=='sym8':
                    [arg] = buf.unpack('B')
                    arg = names[arg]
                elif a=='argvar8':
                    [arg] = buf.unpack('B')
                    arg = (arg,arg_names[arg])
                elif a=='locvar8':
                    [arg] = buf.unpack('B')
                    arg = (arg,local_names[arg])
                elif a=='rel8':
                    [arg] = buf.unpack('B')
                    arg = (arg, codepos+arg)
                elif a=='relb8':
                    [arg] = buf.unpack('B')
                    arg = (arg, codepos-arg)
                elif a=='int16':
                    [arg] = buf.unpack('>h')
                elif a=='sym16':
                    [arg] = buf.unpack('>H')
                    arg = names[arg]
                elif a=='rel16':
                    [arg] = buf.unpack('>H')
                    arg = (arg, codepos+arg)
                elif a=='relb16':
                    [arg] = buf.unpack('>H')
                    arg = (arg, codepos-arg)
                elif a=='int32':
                    [arg] = buf.unpack('>i')
                elif a=='float32':
                    [arg] = buf.unpack('>f')
                elif a=='float64':
                    [arg] = buf.unpack('>F')
                args.append(arg)
        # TODO: Remove these fallbacks, eventually:
        elif opcode >= 0x80:
            opcode = ("UNKNOWN-OPCODE",opcode)
            args = []
        else:
            opcode = ("UNKNOWN-OPCODE",opcode)
            args = []
        print "DB|    code: %s" % ((codepos,opcode,args),)
        res.append((codepos,opcode,args))
    return res

def parse_handler_nr_vector(blob, count):
    buf = SeqBuffer(blob)
    res = {}
    for i in range(1,1+count):
        [nr] = buf.unpack('>h')
        if nr >= 0: res[i] = nr
    # Handler vector entries:
    #  1:mouseDown, 2:mouseUp
    #  3:keyDown??, 4:keyUp
    #  6:prepareFrame
    #  8:mouseEnter, 9:mouseLeave, 10:mouseWithin
    #  12:startMovie, 13:stopMovie
    #  16:exitFrame
    return res


###========== Utilities: ========================================
def subblob(blob, slice_desc, unit_size=1):
    (offset, length) = slice_desc
    return blob[offset : offset + length * unit_size]
