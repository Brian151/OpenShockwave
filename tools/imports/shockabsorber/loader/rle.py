import pyglet.image

# Return a bytearray
def rle_to_image(width, height, fullwidth, bpp, encoded_data):
    return bytes_to_image(rle_decode(width, height, fullwidth, bpp, encoded_data))

def bytes_to_image(image_data):
    if image_data==None: return None
    (width, height, fullwidth, bpp, pixdata) = image_data
    if bpp == 8:
        return make_8bit_rbg_image(width, height, fullwidth, pixdata)
    elif bpp == 16:
        return make_16bit_rbg_image(width, height, fullwidth, pixdata)
    elif bpp == 32:
        return make_32bit_rbg_image(width, height, fullwidth, pixdata)
    else:
        print "Warning: RLE: Unknown bpp: %d" % bpp
        return make_greyscale_image(width, height, fullwidth, pixdata)

def bytes_and_mask_to_image(image_data, mask_data):
    if image_data==None: return None
    (width, height, fullwidth, bpp, pixdata) = image_data
    (width2, height2, fullwidth2, bpp2, pixdata2) = mask_data
    #if bpp == 8:
    #    return make_8bit_rbg_image(width, height, fullwidth, pixdata)
    #el
    if bpp == 16 and bpp2 == 8:
        return make_16bit_rbg_masked_image(width,height,fullwidth, width2,height2,fullwidth2, pixdata, pixdata2)
    elif bpp == 32 and bpp2 == 8:
        return make_32bit_rbg_masked_image(width,height,fullwidth, width2,height2,fullwidth2, pixdata, pixdata2)
    else:
        print "Warning: RLE: Unknown bpp: %d / %d" % (bpp,bpp2)
        return make_greyscale_image(width, height, fullwidth, pixdata) # TODO

# Returns an ImageData
def rle_decode(width, height, fullwidth, bpp, encoded_data):
    bytes_to_output = fullwidth*height
    res = bytearray(bytes_to_output)
    in_pos = 0; in_len = len(encoded_data)
    out_pos = 0
    #x = 0; y = 0
    #fullwidth = width*(bpp//8)
    while in_pos < in_len and out_pos < bytes_to_output:
        d = ord(encoded_data[in_pos]); in_pos+=1
        if d >= 128:
            run_length = 257-d
            v = encoded_data[in_pos]; in_pos+=1
            for i in range(run_length):
                res[out_pos+i] = v
            out_pos += run_length
        else:
            lit_length = 1+d
            res[out_pos:out_pos+lit_length] = encoded_data[in_pos:in_pos+lit_length]
            in_pos += lit_length
            out_pos += lit_length
    print "DB| rle end: out_pos: %d vs. expected %d; in_pos: %d vs. %d" % (out_pos, bytes_to_output, in_pos, in_len)
    #print "DB| rle: converted %s to %s" % (encoded_data, res)
    return (width, height, fullwidth, bpp, res)

def make_greyscale_image(width, height, fullwidth, data):
    return pyglet.image.ImageData(width, height, 'I', data, -fullwidth)

def make_8bit_rbg_image(width, height, fullwidth, data):
    # TODO: This is the wrong palette.
    color_data = ""
    for c in data:
        nr = c
        r = nr >> 5
        g = (nr >> 2) & 7
        b = nr & 3
        #r = nr // 36
        #g = (nr // 6) % 6
        #b = nr % 6
        #if r>5: r=5; g=5; b=5
        color_data += chr(r*(255//7))
        color_data += chr(g*(255//7))
        color_data += chr(b*(255//3))
    return pyglet.image.ImageData(width, height, 'RGB', color_data, -3*fullwidth)

scale_table_31_to_255 = map(lambda v: (v*255)//31 , range(32))

def make_16bit_rbg_image(width, height, fullwidth, data):
    color_res = bytearray(3*width*height)
    pos = 0
    for y in range(height):
        row_start = y*fullwidth
        for x in range(width):
            pix_start = row_start + x
            highbits = data[pix_start]
            lowbits  = data[pix_start + width]
            bits = (highbits << 8) | lowbits
            a = bits >> 15
            r = (bits >> 10) & 31
            g = (bits >> 5) & 31
            b = bits & 31
            if a>0: r=31; g=31; b=0
            color_res[pos]   = scale_table_31_to_255[r]
            color_res[pos+1] = scale_table_31_to_255[g]
            color_res[pos+2] = scale_table_31_to_255[b]
            pos += 3
    color_res = str(color_res)
    return pyglet.image.ImageData(width, height, 'RGB', color_res, -3*width)

def make_16bit_rbg_masked_image(width, height, fullwidth, width2,height2,fullwidth2, data, mask):
    color_res = bytearray(4*width*height)
    pos = 0
    for y in range(height):
        row_start = y*fullwidth
        for x in range(width):
            pix_start = row_start + x
            highbits = data[pix_start]
            lowbits  = data[pix_start + width]
            bits = (highbits << 8) | lowbits
            a = bits >> 15
            r = (bits >> 10) & 31
            g = (bits >> 5) & 31
            b = bits & 31
            if a>0: r=31; g=31; b=0
            color_res[pos]   = scale_table_31_to_255[r]
            color_res[pos+1] = scale_table_31_to_255[g]
            color_res[pos+2] = scale_table_31_to_255[b]
            pos += 4

    for y in range(min(height,height2)):
        pos = y*4*width
        row_start = y*fullwidth2
        for x in range(min(width,width2)):
            color_res[pos+3] = mask[row_start + x]
            pos += 4

    color_res = str(color_res)
    return pyglet.image.ImageData(width, height, 'RGBA', color_res, -4*width)

def make_32bit_rbg_image(width, height, fullwidth, data):
    color_res = bytearray(4*width*height)
    pos = 0
    for y in range(height):
        for x in range(width):
            r = data[y*fullwidth + x]
            g = data[y*fullwidth + x + width]
            b = data[y*fullwidth + x + 2*width]
            a = data[y*fullwidth + x + 3*width]
            color_res[pos]   = r
            color_res[pos+1] = g
            color_res[pos+2] = b
            color_res[pos+3] = a
            pos += 4
    color_res = str(color_res)
    return pyglet.image.ImageData(width, height, 'RGBA', color_res, -4*width)

def make_32bit_rbg_masked_image(width, height, fullwidth, width2,height2,fullwidth2, data, mask):
    color_res = bytearray(4*width*height)
    pos = 0
    for y in range(height):
        for x in range(width):
            r = data[y*fullwidth + x]
            g = data[y*fullwidth + x + width]
            b = data[y*fullwidth + x + 2*width]
            a = data[y*fullwidth + x + 3*width]
            color_res[pos]   = r
            color_res[pos+1] = g
            color_res[pos+2] = b
            pos += 4

    for y in range(min(height,height2)):
        pos = y*4*width
        row_start = y*fullwidth2
        for x in range(min(width,width2)):
            color_res[pos+3] = mask[row_start + x] # Or multiply?
            pos += 4

    color_res = str(color_res)
    return pyglet.image.ImageData(width, height, 'RGBA', color_res, -4*width)


