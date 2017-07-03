#!/usr/bin/env python
# -*- coding: utf-8 -*-
#

from subprocess import call

import sys, os, getopt

import struct

import wave

import aifc

import ntpath

import json

from PIL import Image, ImageDraw, ImagePalette

import bitstring

# pretty hardcoded function for converting the bitd images
def convertBITD( w, h, f, entry ):

	bitmapValues = [[0 for x in range( w )] for y in range( h )]

	draw_x = 0
	draw_y = 0

	start = entry['offset'] + 8 # +8 bytes to skip fourcc and length
	size = entry['length']

	readMode = 0

	if entry["bitdepth"] > 8: # this is bad, there's actually no value if it's a 1-bit image, so it's reading the next byte instead, but it works so hey
		readMode = 1

	pad = 0
	if w % 2:
		pad = h

	if ( ( w * h ) + pad ) == size:
		readMode = 2

	print("readMode: " + str(readMode))

	#padbytes = -1

	# seek to the bitd image data
	f.seek( start )

	while f.tell() <= start + size:

		if readMode == 1: 

			msk = f.read(1)

			bt = bitstring.BitArray( msk ).bin

			i = 0
			for c in bt:

				bitmapValues[ draw_y ][ draw_x ] = 1 - int(c)

				draw_x += 1

				if draw_x >= w:
					draw_x = i-7 # 8-byte offset somehow

					draw_y += 1

				if draw_y >= h:
					return bitmapValues

				i += 1

		elif readMode == 2:

			col = struct.unpack('B', f.read(1) )[0]

			bitmapValues[ draw_y ][ draw_x ] = 0xFF - col

			draw_x += 1

			if draw_x >= w:
				# print("reached line end at " + str( f.tell() - start ) )
				if pad:
					f.read(1) # padding byte?
				
				draw_x = 0
				draw_y += 1

			if draw_y >= h:
				print("reached end at " + str( f.tell() - start ) )
				return bitmapValues

		else:

			rLen = struct.unpack('B', f.read(1) )[0]

			if 0x100 - rLen > 0x7F:
				#if 0x101 - rLen > 0x7F: # this is interesting, for some bitmaps it works, but some need 0x100
				
				#doLog("   lin (" + str(draw_x) + "," + str(draw_y) + " - len " + str(rLen) + ")" )

				rLen += 1

				for j in range(0, rLen):

					#if f.tell() >= l['offset'] + l['length']:
					#	break

					val = struct.unpack('B', f.read(1) )[0]

					#doLog("    lin - value (" + str( 0xFF - val ) + ")" )

					#doLog("     lin - put pixel (" + str( draw_x ) + "," + str(draw_y) + "=" + str( 0xFF - val ) + ")")

					bitmapValues[ draw_y ][ draw_x ] = 0xFF - val

					draw_x += 1
					
					if draw_x >= w:
						#doLog("    lin - line change (x" + str( draw_x-1 ) + "/y" + str(draw_y+1) + "@p" + str( f.tell() - start ) + ")")
						
						if w % 2:
							draw_x = -1
						else:
							draw_x = 0

						draw_y += 1

					if draw_y >= h:
						#doLog("    lin - exceeded height (" + str( (start+size) - f.tell() ) + " bytes left)")
						return bitmapValues


			else:

				rLen = 0x101 - rLen

				val = struct.unpack('B', f.read(1) )[0]

				#doLog("   rle (" + str(draw_x) + "," + str(draw_y) + " - len " + str(rLen) + ")" )

				#doLog("    rle - value (" + str( 0xFF - val ) + ")" )

				for j in range(0, rLen):

					#if f.tell() >= l['offset'] + l['length']:
					#	break

					#doLog("      rle - put pixel (" + str( draw_x ) + "," + str(draw_y) + "=" + str( 0xFF - val ) + ")")

					bitmapValues[ draw_y ][ draw_x ] = 0xFF - val

					draw_x += 1

					if draw_x >= w:
						#doLog("    rle - line change (x" + str( draw_x-1 ) + "/y" + str(draw_y+1) + "@p" + str( f.tell() - start ) + ")")
						
						if w % 2:
							draw_x = -1
						else:
							draw_x = 0

						draw_y += 1

					if draw_y >= h:
						#doLog("    rle - exceeded height (" + str( (start+size) - f.tell() ) + " bytes left)")
						return bitmapValues


	return bitmapValues

writeRaw = False

fileNum = 1

entries = {}

castList = []

metaList = {}

BigEndian = False


def doLog(t):
	global logfile
	logfile.write(t + "\n")
	print(t)


# f = open(sys.argv[1], "rb")

def readCST(f):

	global entries, castList, metaList, BigEndian

	# fourcc
	# pos 0-4 (XFIR)
	RIFX_SIGN = f.read(4).decode("utf-8")
	doLog( "RIFX_SIGN: " + str( RIFX_SIGN ) )

	# this is a mess tbh
	if RIFX_SIGN == "RIFX":
		BigEndian = False
	else:
		BigEndian = True

	# file size/length
	# pos 4-8 (Length)
	SIZE = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]
	doLog( "SIZE: " + str( SIZE ) + " (" + str( round( SIZE / 1024 ) ) + "kb)" )

	# some signage related to cst/cxt & dir/dxr
	# pos 8-12
	SIGN = f.read(4)
	doLog( "SIGN: " + str( SIGN ) )

	# skip to offset 60, just for convenience
	f.seek(60) # pos 60

	# get file count for pointer list
	rawFileNum = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]
	doLog( "File num: " + str( rawFileNum ) )

	# skip 12 bytes to beginning of file pointers
	f.read(12) # pos 76, file block begin


	doLog("\n\n--- READ POINTERS ---")
	for i in range(0, rawFileNum):

		# save beginning of pointer
		pointerOffset = f.tell()

		# file type fourcc (cast/sound/bitmap etc)
		if BigEndian:
			entryType = f.read(4).decode("utf-8")[::-1] # 4
		else:
			entryType = f.read(4).decode("utf-8") # 4

		# file size
		entryLength = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0] # 8

		# file offset
		entryOffset = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0] # 12

		'''
		if entryType != "free":
			doLog("[POINT " + str(i) + " @ " + str(pointerOffset) + "][" + (entryType) + "] Length: " + str( entryLength ) + ", Offset: " + str( entryOffset ) )
		else:
			doLog("[POINT " + str(i) + " @ " + str(pointerOffset) + "][----]")
		'''

		'''
		entries.append({
			'num': i,
			'name': '',
			'type': entryType,
			'length': entryLength,
			'offset': entryOffset,
			'poffset': pointerOffset,
			'files': [],
			'friendlyType': ''
		})
		'''
		entries[i] = {
			'num': i,
			'name': '',
			'type': entryType,
			'length': entryLength,
			'offset': entryOffset,
			'poffset': pointerOffset,
			'files': [],
			'friendlyType': ''
		}

		f.read(8) # padding data?


	# loop through all found entries, skip all but the KEY* list
	doLog("\n\n--- READ KEY ---")

	for i in entries:

		e = entries[i]

		if e['type'] != "KEY*":
			continue

		f.seek( e['offset'], 0 )

		fEntryHeaderRaw = f.read(4) # fourcc header

		fEntryLengthRaw = f.read(4) # length


		# parse header, and reverse it if applicable
		if BigEndian:
			fEntryHeader = fEntryHeaderRaw.decode("utf-8")[::-1]
		else:
			fEntryHeader = fEntryHeaderRaw.decode("utf-8")

		# parse length
		fEntryLength = struct.unpack( ('i' if BigEndian else '>i'), fEntryLengthRaw )[0]

		# put into entry data
		e['headerRaw'] = fEntryHeaderRaw
		e['lengthRaw'] = fEntryLengthRaw


		doLog("--- KEY @ " + str( e['offset'] ) + " ---")
		
		# no idea what these do
		fUnknownNum1 = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]
		fUnknownNum2 = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]

		# total list of entries in key list
		fEntryNum = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]

		# doLog(" fUnknownNum1: " + str( fUnknownNum1 ) + ", fUnknownNum2: " + str( fUnknownNum2 ) + ", fEntryNum: " + str( fEntryNum ) )

		for i in range(0, fEntryNum):

			# save offset
			kPos = f.tell()
			
			# slot in entries pointing to a file (bitd/snd/script ex.)
			castFileSlot = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]

			# slot in entries pointing to the cast
			castSlot = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]

			if BigEndian:
				castType = f.read(4).decode("utf-8")[::-1]
			else:
				castType = f.read(4).decode("utf-8")

			# doLog("[KEY " + str(i) + "] Cast file slot offset: " + str( castFileSlot ) + ", Cast slot offset: " + str( castSlot ) + ", Type: " + str( castType ) )

			if not castSlot in entries:
				doLog("  INVALID KEY CAST SLOT: " + str( castFileSlot ) + "->" + str( castSlot ) + " (" + str( castType ) + ") @ " + str(kPos) )

			elif not castFileSlot in entries:
				doLog("  INVALID KEY FILE SLOT: " + str( castFileSlot ) + "->" + str( castSlot ) + " (" + str( castType ) + ") @ " + str(kPos) )

			else:
				entries[ castFileSlot ]['parent'] = entries[ castSlot ]
				entries[ castSlot ]['files'].append( entries[ castFileSlot ] )
			
			# doLog("  KeyCastOffset: " + str( castOffset ) + ", KeyCastId: " + str( castId ) + ", KeyCastType: " + str( castType ) )



	# loop through all the rest of the files
	doLog("\n\n--- READ FILES ---")
	for i in entries:

		e = entries[i]

		# skip junk
		if e['type'] == "free" or e['type'] == "junk":
			continue

		f.seek( e['offset'], 0 )

		fEntryHeaderRaw = f.read(4)
		fEntryLengthRaw = f.read(4)

		if BigEndian:
			fEntryHeader = fEntryHeaderRaw.decode("utf-8")[::-1]
		else:
			fEntryHeader = fEntryHeaderRaw.decode("utf-8")

		fEntryLength = struct.unpack( ('i' if BigEndian else '>i'), fEntryLengthRaw )[0]

		e['headerRaw'] = fEntryHeaderRaw
		e['lengthRaw'] = fEntryLengthRaw

		doLog("[FILE " + str(e['num']) + " @ " + str(e['offset']) + "][" + e['type'] + "->" + fEntryHeader + "]")

		if e['type'] == 'STXT':

			# unknown
			f.read(4)

			# length of the text
			textLength = struct.unpack('>i', f.read(4) )[0]

			# data at the end of the content, no idea what
			textPadding = struct.unpack('>i', f.read(4) )[0]

			# read text content
			textContent = f.read( textLength )

			e['content'] = textContent


		if e['type'] == 'BITD':
			e['content'] = f.read(fEntryLength)


		if e['type'] == 'sndS':
			e['content'] = f.read(fEntryLength)


		if e['type'] == 'sndH':
			# e['content'] = f.read(fEntryLength)

			f.read(4) # unknown

			soundLength = struct.unpack('>i', f.read(4) )[0]

			f.read(4) # what

			f.read(20) # null?

			f.read(4) # sound length plus what

			f.read(4) # sound length again?

			f.read(4) # sound length again?

			sampleRate = struct.unpack('>i', f.read(4) )[0]

			f.read(4) # sample rate again?

			e['soundLength'] = soundLength
			e['sampleRate'] = sampleRate

			if 'parent' in e:
				e['parent']['soundLength'] = soundLength
				e['parent']['sampleRate'] = sampleRate


		if e['type'] == 'cupt':

			# e['content'] = f.read(fEntryLength)
			# f.seek( e['offset'], 0 )

			cuptEntries = struct.unpack('>i', f.read(4) )[0]

			# print("CUPT Entries: " + str(cuptEntries))

			e['cuePoints'] = []

			for i in range(0, cuptEntries):

				something = struct.unpack('>h', f.read(2) )[0]

				sampleOffset = struct.unpack('>h', f.read(2) )[0]

				textLength = struct.unpack('>b', f.read(1) )[0]

				# print("TL: " + str(textLength))

				if textLength > 0:

					cueName = f.read(textLength).decode("ansi")

				else:

					cueName = ""


				padLength = 31 - textLength

				f.seek(padLength, 1)

				e['cuePoints'].append([ sampleOffset, cueName ])

				print( " " + str(cueName) + " @ " + str(sampleOffset) + "/" + str(something) )


		
		if e['type'] == 'CASt':

			# cast type, e.g. 1 = bitmap, 3 = field, 6 = audio
			castType = struct.unpack('>i', f.read(4) )[0]
			e['castType'] = castType

			# data length
			castDataLen = struct.unpack('>i', f.read(4) )[0]
			e['dataLength'] = castDataLen

			# data at the end of the data, good description
			castDataEnd = struct.unpack('>i', f.read(4) )[0]
			e['dataEnd'] = castDataEnd
			
			# bitmap
			if castType == 1:

				# f.read(2) # it always seems to be 32, skip that

				something = struct.unpack('>h', f.read(2) )[0]

				if something == 0:

					f.read(30)

					# this byte appears to be 02 if there's a name available
					hasName = struct.unpack('>h', f.read(2) )[0]

					if hasName > 0:

						f.read(8) # pad

						f.read(4) # text length int32, not required i think

						# read cast name with a byte infront specifying the length
						castInfoName = f.read( struct.unpack('b', f.read(1) )[0] ).decode('ansi')
						e['name'] = castInfoName

						# f.read(3)

					else:

						doLog(" !!! BITMAP - NO NAME (" + str( e['memberNum'] ) + ") !!!")

						f.read(3)

					f.read(3)


				e['friendlyType'] = 'bitmap'				

				# i don't know the term for this, so i called it padding
				e['paddingH'] = struct.unpack('>h', f.read(2) )[0]
				e['paddingW'] = struct.unpack('>h', f.read(2) )[0]

				# to note with all of these, they're in "height, width" order
				e['heightRaw'] = struct.unpack('>h', f.read(2) )[0]
				e['widthRaw'] = struct.unpack('>h', f.read(2) )[0]

				# to get the proper width/height, the padding has to be subtracted off values, no idea what purpose it serves
				e['height'] = e['heightRaw'] - e['paddingH']
				e['width'] = e['widthRaw'] - e['paddingW']

				# no clue what this is
				e['constant'] = f.read(4)

				# neither this
				f.read(4)

				# reg point, for having something else than 0,0 as the center, same subtracting stuff here
				e['regyRaw'] = struct.unpack('>h', f.read(2) )[0]
				e['regxRaw'] = struct.unpack('>h', f.read(2) )[0]
				e['regy'] = e['regyRaw'] - e['paddingH']
				e['regx'] = e['regxRaw'] - e['paddingW']

				# THE DATA ENDS HERE IF THE BITMAP IS 1-BIT

				e['bitalpha'] = struct.unpack('b', f.read(1) )[0] # not sure at all

				e['bitdepth'] = struct.unpack('b', f.read(1) )[0]

				e['palette'] = struct.unpack('>h', f.read(2) )[0] # i have only seen -1 being used here


			if castType == 3:
				e['friendlyType'] = 'field'
				f.read(70)
				
				# this is a bad solution
				rl = struct.unpack('b', f.read(1) )[0]
				if rl > 0:
					castInfoName = f.read( rl ).decode('ansi')
					e['name'] = castInfoName
				elif 'memberNum' in e:
					doLog(" !!! FIELD - NO NAME (" + str( e['memberNum'] ) + ") !!!")
				else:
					doLog(" !!! FIELD - NO NAME, NO ID !!!")



			if castType == 6:

				e['friendlyType'] = 'sound'

				# in one file this worked, subtracting some values and getting an offset, but ultimately it wasn't reliable
				'''

				castSub1 = struct.unpack('>i', f.read(4) )[0]

				f.read(8)

				castSub2 = struct.unpack('>i', f.read(4) )[0]

				f.read( castSub1 - castSub2 )

				

				castFields = struct.unpack('>h', f.read(2) )[0]

				# doLog(" [INFO] Fields: " + str(castFields) )

				for i in range(0, castFields):
					f.read(4)
				'''

				skipLen = struct.unpack('>i', f.read(4) )[0]

				f.read(skipLen - 4)

				cFields = struct.unpack('>h', f.read(2) )[0]

				print("fields: " + str(cFields))

				for i in range(0, cFields):
					f.read(4)


				castInfoLen = struct.unpack('>i', f.read(4) )[0]

				castInfoName = f.read( struct.unpack('b', f.read(1) )[0] ).decode('utf-8')

				f.read(1)

				castInfoCodec = f.read( struct.unpack('b', f.read(1) )[0] ).decode('utf-8')

				e['name'] = castInfoName
				e['codec'] = castInfoCodec
				


			# garbage really
			if castType == 11:
				e['friendlyType'] = 'misc/xtra'


		# cast position definer
		if e['type'] == "CAS*":

			for i in range(0, round(fEntryLength/4) ): #two values, so divide by 4 (bytes)

				# cast slot is an int
				castSlot = struct.unpack('>i', f.read(4) )[0]

				# offset by one
				entries[ castSlot ]['memberNum'] = i + 1

				# add to cast list
				castList.append( entries[ castSlot ] )

				#metaList[ castSlot ] = {
				#}



#tmp = Image.open( "pal.bmp" )
#mullePalette = tmp.palette
#tmp.close()

# mostly metadata in json here
def parseCast( num, f ):
	
	# doLog("[CAST " + str(e['num']) + "]")

	global entries, castList, metaList, writeRaw

	# e = entries[num]
	e = castList[ num ]

	if e['type'] != 'CASt':
		# doLog("[" + e['type'] + "] ???\n")
		return False

	metaList[ e['memberNum'] ] = {}

	metaList[ e['memberNum'] ]['num'] = e['memberNum']

	doLog("[CAST " + str(e['memberNum']) + "]")

	doLog(" [TYPE] " + str( e["castType"] ) + " (" + str( e["friendlyType"] ) + ")" )

	metaList[ e['memberNum'] ]['castType'] = e['castType']
	metaList[ e['memberNum'] ]['castTypeF'] = e['friendlyType']

	if 'codec' in e:
		doLog(" [CODEC] " + str( e["codec"] ) )
		metaList[ e['memberNum'] ]['soundCodec'] = e['codec']

	if e["castType"] == 1: # bitmap

		doLog(" [SIZE] " + str( e["width"] ) + "x" + str( e["height"] ) + " (" + str( e["widthRaw"] ) + "x" + str( e["heightRaw"] ) + ")" )
		metaList[ e['memberNum'] ]['imageWidth'] = e['width']
		metaList[ e['memberNum'] ]['imageHeight'] = e['height']

		doLog(" [PAD] " + str( e["paddingW"] ) + "x" + str( e["paddingH"] ) )

		doLog(" [REG] " + str( e["regx"] ) + "," + str( e["regy"] ) )
		metaList[ e['memberNum'] ]['imageRegX'] = e['regx']
		metaList[ e['memberNum'] ]['imageRegY'] = e['regy']

		doLog(" [CONSTANT] " + str( e["constant"] ) + " / " + str( struct.unpack('i', e["constant"] )[0] ) )

		doLog(" [BITDEPTH] " + str( e["bitdepth"] ) )

		doLog(" [BITALPHA] " + str( e["bitalpha"] ) )

		doLog(" [PALETTE] " + str( e["palette"] ) )

	if e["castType"] == 6: # sound

		doLog(" [SAMPLERATE] " + str( e["sampleRate"] ) )
		metaList[ e['memberNum'] ]['sampleRate'] = e['sampleRate']


	doLog(" [SYS] POffset: " + str( e["poffset"] ) + ", Offset: " + str( e["offset"] ) + ", Length: " + str( e["length"] ) + ", Data length: " + str( e["dataLength"] ) + ", Data end: " + str( e["dataEnd"] ) )

	if 'name' in e:
		doLog(" [INFO] Name: " + str( e["name"] ) )
		metaList[ e['memberNum'] ]['name'] = e['name']



	for l in e['files']:
		
		# doLog(" [INFO] Codec: " + str( castInfoCodec ) )
		doLog("  [LINKED] Num: " + str(l["num"]) + ", Type: " + l['type'] + ", POffset: " + str( l['poffset'] ) + ", Offset: " + str( l['offset'] ) + ", Length: " + str( l['length'] ) )

		if l['type'] == "sndS":

			# if e['codec'] == "kMoaCfFormat_WAVE" or e['codec'] == "kMoaCfFormat_snd":
			
			# using a python library here to write the wav data, even if it's an aiff file, dunno why that works
			snd = wave.open( outFolder + "/" + str(e['memberNum']) + ".wav", "w")
			snd.setnchannels(1)
			snd.setsampwidth(1)
			snd.setframerate( e["sampleRate"] )
			snd.writeframes( l['content'] )
			snd.close()

			'''
			elif e['codec'] == "kMoaCfFormat_AIFF":
			
				# using a python library here to write the wav data, even if it's an aiff file, dunno why that works
				snd = aifc.open( outFolder + "/" + str(e['memberNum']) + ".aifc", "w")

				# snd.aiff()
				
				snd.setnchannels(1)

				snd.setsampwidth(1)

				snd.setframerate( e["sampleRate"] )

				snd.writeframes( l['content'] )

				snd.close()
			'''


			doLog("   [DURATION] " + str( l["length"] / e["sampleRate"] ) )

			metaList[ e['memberNum'] ]['duration'] = l["length"] / e["sampleRate"]

			metaList[ e['memberNum'] ]['size'] = l["length"]
			

		if l['type'] == "BITD":

			if e["width"] <= 0 or e["height"] <= 0:
				continue

			if e["width"] > 4096 or e["height"] > 4096:
				continue

			l["bitdepth"] = e["bitdepth"]

			metaList[ e['memberNum'] ]['size'] = l["length"]
			
			
			if writeRaw:
				bitm = open( outFolder + "/" + str(e['memberNum']) + ".bitd", "wb")
				bitm.write( l['content'] )
				bitm.close()
			

			if e["bitdepth"] > 8:
				im = Image.new("1", (e["width"], e["height"]) ) # 1-bit 0/1 image
			else:
				im = Image.new("P", (e["width"], e["height"]) ) # 8-bit palette image
				tmp = Image.open( "pal.bmp" )
				im.palette = tmp.palette
				tmp.close()

			dr = ImageDraw.Draw(im)
			
			bitmapValues = convertBITD( e['width'], e['height'], f, l )

			x = 0
			y = 0

			# doLog( str(len(colours[0])) + ", " + str(len(colours[1])) + ", " + str(len(colours[2])) )

			# draw the image
			for y in range( 0, e['height']  ):
				for x in range( 0, e['width'] ):
					dr.point( (x, y), bitmapValues[y][x] )

			# save as bmp
			im.save( outFolder + "/tmp.bmp", "BMP")

			# use magick to convert one opaque and one transparent (from white colour) png
			call("magick convert " + outFolder + "/tmp.bmp " + outFolder + "/" + str(e['memberNum']) + ".png")
			# call("magick convert " + outFolder + "/tmp.bmp " + outFolder + "/" + str(e['memberNum']) + "O.png")
			# call("magick convert " + outFolder + "/tmp.bmp -transparent \"#FFFFFF\" " + outFolder + "/" + str(e['memberNum']) + "T.png")
			
			del dr

		if l['type'] == "STXT":
			
			# simply write the text data
			txt = open( outFolder + "/" + str(e['memberNum']) + ".txt", "wb")
			txt.write( l['content'] )
			txt.close()
			

		if l['type'] == "cupt":

			print("   [CUEPOINTS] " + str(l['cuePoints']) )

			metaList[ e['memberNum'] ]['cuePoints'] = l['cuePoints']

			# cupt = open( outFolder + "/" + str(e['memberNum']) + ".cupt", "wb")
			# cupt.write( l['content'] )
			# cupt.close()
	
	if writeRaw:
		cst = open( outFolder + "/" + str(e['memberNum']) + ".cast", "wb")
		f.seek( e['offset'], 0 )
		cst.write( f.read( e['length'] + 8 ) )
		cst.close()
	

	# test
	if e["castType"] == 4:
		doLog("PALETTE!!")
		return

	doLog("")

def main(argv):

	global logfile, outFolder

	if len(sys.argv) <= 1:
		print("Usage: python cst_python.py <filename> <optional cast number>")
		return

	cfgInputCST = sys.argv[1]

	cfgFileName = ntpath.basename(cfgInputCST)

	# cfgCastNum = ( int(sys.argv[2]) - 1 ) if sys.argv[2] else 0
	if len(sys.argv) >= 3:
		cfgCastNum = ( int(sys.argv[2]) - 1 )
	else:
		cfgCastNum = 0



	logfile = open("cst_" + cfgFileName + ".log", "w")


	f = open(cfgInputCST, "rb")


	outFolder = "cst_out/" + cfgFileName

	if not os.path.exists(outFolder):
		print("MAKE FOLDER")
		os.makedirs(outFolder)


	readCST(f)


	doLog("\n\n--- READ CASTS ---")

	if cfgCastNum > 0:
		parseCast( cfgCastNum, f )
	else:
		for idx, val in enumerate(castList):
			parseCast(idx, f)

		meta = open( outFolder + "/metadata.json", "w")
		meta.write( json.dumps( metaList ) )
		meta.close()

	f.close()
	logfile.close()


if __name__ == "__main__":
   main(sys.argv[1:])

