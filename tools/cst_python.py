#!/usr/bin/env python
# -*- coding: utf-8 -*-
#

from subprocess import call

import sys, os, getopt

import struct

import wave

import ntpath

import json

from PIL import Image, ImageDraw, ImagePalette

import bitstring


def convertBITD( w, h, f, entry ):

	bitmapValues = [[0 for x in range( w )] for y in range( h )]

	draw_x = 0
	draw_y = 0

	start = entry['offset'] + 8
	size = entry['length']

	#padbytes = -1

	f.seek( start )

	print("seek to " + str(start) )

	while f.tell() <= start + size:

		if entry["bitdepth"] > 8: # this is bad, there's actually no value if it's a 1-bit image, so it's reading the next byte instead, but it works so hey

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

		else:

			rLen = struct.unpack('B', f.read(1) )[0]

			if 0x101 - rLen > 0x7F: # this is interesting, for some bitmaps it works, but some need 0x100
				
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

	# pos 0-4 (XFIR)
	RIFX_SIGN = f.read(4).decode("utf-8")
	doLog( "RIFX_SIGN: " + str( RIFX_SIGN ) )

	# this is a mess tbh
	if RIFX_SIGN == "RIFX":
		BigEndian = False
	else:
		BigEndian = True

	# pos 4-8 (Length)
	SIZE = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]
	doLog( "SIZE: " + str( SIZE ) + " (" + str( round( SIZE / 1024 ) ) + "kb)" )

	# pos 8-12
	SIGN = f.read(4)
	doLog( "SIGN: " + str( SIGN ) )


	f.seek(60) # pos 60

	rawFileNum = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]
	doLog( "File num: " + str( rawFileNum ) )

	f.read(12) # pos 76, file block begin


	doLog("\n\n--- READ POINTERS ---")
	for i in range(0, rawFileNum):

		pointerOffset = f.tell()

		if BigEndian:
			entryType = f.read(4).decode("utf-8")[::-1] # 4
		else:
			entryType = f.read(4).decode("utf-8") # 4

		entryLength = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0] # 8
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

		f.read(8)

	doLog("\n\n--- READ KEY ---")

	for i in entries:

		e = entries[i]

		if e['type'] != "KEY*":
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

		doLog("--- KEY @ " + str( e['offset'] ) + " ---")
		
		fUnknownNum1 = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]

		fUnknownNum2 = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]

		fEntryNum = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]

		# doLog(" fUnknownNum1: " + str( fUnknownNum1 ) + ", fUnknownNum2: " + str( fUnknownNum2 ) + ", fEntryNum: " + str( fEntryNum ) )

		for i in range(0, fEntryNum):

			kPos = f.tell()
			
			castFileSlot = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]

			castSlot = struct.unpack( ('i' if BigEndian else '>i'), f.read(4) )[0]

			if BigEndian:
				castType = f.read(4).decode("utf-8")[::-1]
			else:
				castType = f.read(4).decode("utf-8")

			# doLog("[KEY " + str(i) + "] Cast file slot offset: " + str( castFileSlot ) + ", Cast slot offset: " + str( castSlot ) + ", Type: " + str( castType ) )

			# entries[ castSlot ]['slotNum'] = castSlot
			# entries[ castSlot ]['fileSlot'] = castFileSlot
			# entries[ castSlot ]['fileObj'] = entries[ castFileSlot ]

			if not castSlot in entries:
				doLog("  INVALID KEY CAST SLOT: " + str( castFileSlot ) + "->" + str( castSlot ) + " (" + str( castType ) + ") @ " + str(kPos) )

			elif not castFileSlot in entries:
				doLog("  INVALID KEY FILE SLOT: " + str( castFileSlot ) + "->" + str( castSlot ) + " (" + str( castType ) + ") @ " + str(kPos) )

			else:
				entries[ castSlot ]['files'].append( entries[ castFileSlot ] )
			
			# doLog("  KeyCastOffset: " + str( castOffset ) + ", KeyCastId: " + str( castId ) + ", KeyCastType: " + str( castType ) )


	doLog("\n\n--- READ FILES ---")
	for i in entries:

		e = entries[i]

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

			f.read(4) # content

			textLength = struct.unpack('>i', f.read(4) )[0]

			textPadding = struct.unpack('>i', f.read(4) )[0]

			# fPad = struct.unpack('i', f.read(1) )[0]

			textContent = f.read( textLength )

			e['content'] = textContent


		if e['type'] == 'BITD':
			e['content'] = f.read(fEntryLength)


		if e['type'] == 'sndS':
			e['content'] = f.read(fEntryLength)

		
		if e['type'] == 'CASt':

			# 3 - field
			# 6 - audio

			castType = struct.unpack('>i', f.read(4) )[0]
			e['castType'] = castType

			castDataLen = struct.unpack('>i', f.read(4) )[0]
			e['dataLength'] = castDataLen

			castDataEnd = struct.unpack('>i', f.read(4) )[0]
			e['dataEnd'] = castDataEnd
			
			# bitmap
			if castType == 1:

				f.read(32)

				hasName = struct.unpack('>h', f.read(2) )[0]

				if hasName > 0:

					f.read(8) # pad
					f.read(4) # length

					castInfoName = f.read( struct.unpack('b', f.read(1) )[0] ).decode('ansi')
					e['name'] = castInfoName

				else:

					doLog(" !!! BITMAP - NO NAME (" + str( e['memberNum'] ) + ") !!!")

					f.read(3)


				e['friendlyType'] = 'bitmap'

				f.read(3)

				e['paddingH'] = struct.unpack('>h', f.read(2) )[0]
				e['paddingW'] = struct.unpack('>h', f.read(2) )[0]

				e['heightRaw'] = struct.unpack('>h', f.read(2) )[0]
				e['widthRaw'] = struct.unpack('>h', f.read(2) )[0]

				e['height'] = e['heightRaw'] - e['paddingH']
				e['width'] = e['widthRaw'] - e['paddingW']

				e['constant'] = f.read(4) # struct.unpack('>i', f.read(4) )[0]

				f.read(4)

				e['regyRaw'] = struct.unpack('>h', f.read(2) )[0]
				e['regxRaw'] = struct.unpack('>h', f.read(2) )[0]
				e['regy'] = e['regyRaw'] - e['paddingH']
				e['regx'] = e['regxRaw'] - e['paddingW']

				e['bitalpha'] = struct.unpack('b', f.read(1) )[0]
				e['bitdepth'] = struct.unpack('b', f.read(1) )[0]
				e['palette'] = struct.unpack('>h', f.read(2) )[0]



			if castType == 3:
				e['friendlyType'] = 'field'
				f.read(70)
				
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

				f.read(100)

				castInfoLen = struct.unpack('>i', f.read(4) )[0]

				castInfoName = f.read( struct.unpack('b', f.read(1) )[0] ).decode('utf-8')

				f.read(1)

				castInfoCodec = f.read( struct.unpack('b', f.read(1) )[0] ).decode('utf-8')

				e['name'] = castInfoName
				e['codec'] = castInfoCodec
				



			if castType == 11:
				e['friendlyType'] = 'misc/xtra'



		if e['type'] == "CAS*":

			for i in range(0, round(fEntryLength/4) ):

				castSlot = struct.unpack('>i', f.read(4) )[0]
				entries[ castSlot ]['memberNum'] = i + 1

				castList.append( entries[ castSlot ] )

				#metaList[ castSlot ] = {
				#}



#tmp = Image.open( "pal.bmp" )
#mullePalette = tmp.palette
#tmp.close()

def parseCast( num, f ):
	
	# doLog("[CAST " + str(e['num']) + "]")

	global entries, castList, metaList

	# e = entries[num]
	e = castList[ num ]

	if e['type'] != 'CASt':
		doLog("[" + e['type'] + "] ???\n")
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


	if 'width' in e:
		doLog(" [SIZE] " + str( e["width"] ) + "x" + str( e["height"] ) + " (" + str( e["widthRaw"] ) + "x" + str( e["heightRaw"] ) + ")" )
		metaList[ e['memberNum'] ]['imageWidth'] = e['width']
		metaList[ e['memberNum'] ]['imageHeight'] = e['height']

	if 'paddingW' in e:
		doLog(" [PAD] " + str( e["paddingW"] ) + "x" + str( e["paddingH"] ) )

	if 'regx' in e:
		doLog(" [REG] " + str( e["regx"] ) + "," + str( e["regy"] ) )
		metaList[ e['memberNum'] ]['imageRegX'] = e['regx']
		metaList[ e['memberNum'] ]['imageRegY'] = e['regy']

	if 'constant' in e:
		doLog(" [CONSTANT] " + str( e["constant"] ) + " / " + str( struct.unpack('i', e["constant"] )[0] ) )

	if 'bitdepth' in e:
		doLog(" [BITDEPTH] " + str( e["bitdepth"] ) )

	if 'bitalpha' in e:
		doLog(" [BITALPHA] " + str( e["bitalpha"] ) )

	if 'palette' in e:
		doLog(" [PALETTE] " + str( e["palette"] ) )


	doLog(" [SYS] POffset: " + str( e["poffset"] ) + ", Offset: " + str( e["offset"] ) + ", Length: " + str( e["length"] ) + ", Data length: " + str( e["dataLength"] ) + ", Data end: " + str( e["dataEnd"] ) )

	if 'name' in e:
		doLog(" [INFO] Name: " + str( e["name"] ) )
		metaList[ e['memberNum'] ]['name'] = e['name']



	for l in e['files']:
		
		# doLog(" [INFO] Codec: " + str( castInfoCodec ) )
		doLog("  [LINKED] Num: " + str(l["num"]) + ", Type: " + l['type'] + ", POffset: " + str( l['poffset'] ) + ", Offset: " + str( l['offset'] ) + ", Length: " + str( l['length'] ) )

		if l['type'] == "sndS":
			
			snd = wave.open( outFolder + "/" + str(e['memberNum']) + ".wav", "w")
			snd.setnchannels(1)
			snd.setsampwidth(1)
			snd.setframerate(22050.0)
			snd.writeframesraw( l['content'] )
			snd.close()
			

		if l['type'] == "BITD":

			if e["width"] <= 0 or e["height"] <= 0:
				continue

			if e["width"] > 4096 or e["height"] > 4096:
				continue

			l["bitdepth"] = e["bitdepth"]
			
			'''
			# uncomment to write raw files
			bitm = open( outFolder + "/" + str(e['memberNum']) + ".bitd", "wb")
			bitm.write( l['content'] )
			bitm.close()
			'''

			if e["bitdepth"] > 8:
				im = Image.new("1", (e["width"], e["height"]) )
			else:
				im = Image.new("P", (e["width"], e["height"]) )
				tmp = Image.open( "pal.bmp" )
				im.palette = tmp.palette
				tmp.close()

			dr = ImageDraw.Draw(im)
			
			bitmapValues = convertBITD( e['width'], e['height'], f, l )

			draw_x = 0
			draw_y = 0

			doit = True

			

			# doLog( str( colours ) )

			x = 0
			y = 0

			# doLog( str(len(colours[0])) + ", " + str(len(colours[1])) + ", " + str(len(colours[2])) )

			for y in range( 0, e['height']  ):
				for x in range( 0, e['width'] ):
					dr.point( (x, y), bitmapValues[y][x] )


			im.save( outFolder + "/" + str(e['memberNum']) + ".bmp", "BMP")

			call("magick convert " + outFolder + "/" + str(e['memberNum']) + ".bmp " + outFolder + "/" + str(e['memberNum']) + "O.png")
			call("magick convert " + outFolder + "/" + str(e['memberNum']) + ".bmp -transparent \"#FFFFFF\" " + outFolder + "/" + str(e['memberNum']) + "T.png")
			
			del dr

		if l['type'] == "STXT":
			
			txt = open( outFolder + "/" + str(e['memberNum']) + ".txt", "wb")
			txt.write( l['content'] )
			txt.close()
			
	'''
	# uncomment to write raw files
	cst = open( outFolder + "/" + str(e['memberNum']) + ".cast", "wb")
	f.seek( e['offset'], 0 )
	cst.write( f.read( e['length'] + 8 ) )
	cst.close()
	'''

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

