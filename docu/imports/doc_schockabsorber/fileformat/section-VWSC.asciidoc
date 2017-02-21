Section "VWSC"
--------------

Purpose of section::
Description of the "Score", i.e. sprite channels, frame behaviours etc.

Related sections::
"VWLB" -- frame labels.

### Format

    +========+==============+===========+================+==================+
    | Header | Offset table | Framedata | Interval-order | Frame-intervals  |
    +========+==============+===========+================+==================+

The offset table divides the rest of the section up into a sequence of
bytestrings; the first of these contains the framedata, the second
contains the interval-order, the third is empty, and the rest contains
the frame-intervals.  The frame-intervals are referred to by the other
two main subsections.

### Header

    +---+---+---+---+
    |  TotalLength  |  Total length of section
    +---+---+---+---+
    |               |  Constant = -3
    +---+---+---+---+
    |               |  Constant = 12
    +---+---+---+---+
    |  EntryCount   |  Number of entries and size of offset table
    +---+---+---+---+
    |               |  Invariant = EntryCount+1
    +---+---+---+---+
    |  EntrySizeSum |
    +---+---+---+---+

Invariant: 6*4 + 4*(EntryCount+1) + EntrySizeSum = TotalLength

### Offset table

    [Repeat (EntryCount+1) times (numbered 0...EntryCount)
     +---+---+---+---+
     |  Offset       |  Offset from start of "Entries"
     +---+---+---+---+
    ]

in the following numbered from 0 to EntryCount.

### Entries

Entry number *i* (henceforth, +entry[i]+) is defined as the bytestring
between `offset[i]` and `offset[i+1]`.

Entries are grouped in threes (see below).

### Framedata

+entry[0]+ contains the bytes of the framedata subsection.

Purpose::
Describes the sprite properties for each frame.

    +========+==========+==========+=====+==========+
    | Header | Frame[0] | Frame[1] | ... | Frame[n] |
    +========+==========+==========+=====+==========+

#### Framedata Header

    +---+---+---+---+
    | ActualLength  |  Actual length of primary, excluding padding.
    +---+---+---+---+
    |               |  Header size? (Constant = 20)
    +---+---+---+---+
    | FrameCount    |  The number of frames in the movie
    +---+---+---+---+
    |       |          (Constant = 13)
    +---+---+
    |       |          SpriteByteSize -- the number of bytes per channel per frame (Constant = 48)
    +---+---+
    |       |          ChannelCount -- the number of sprite channels (typically 1006)
    +---+---+
    |       |          (Multiple of 10, often of 50)
    +---+---+

#### Frame data encoding

Frame data is encoded as a *delta* -- a difference to be applied to
the frame data for frame *n-1* in order to obtain the framedata for
frame *n*.

     +---+---+ <-- FDStart
     | Length|          Length of Sprite channel subsection, from FDStart
     +---+---+
     [ Repetition FrameCount times (= until position FDStart + Length)
       +----+----+
       |DeltaLen |
       +----+----+
       | Offset  |  Position in frame description vector to apply delta
       +----+----+
       +=========+ <--- DeltaStart
       | Delta   |
       +=========+ <--- DeltaEnd = DeltaStart + DeltaLen
     ]

#### Frame data

The frame data, in the form of a sprite-property vector, has the
following form when decoded from the delta format:

    +---+---+ <--- +0
    | Flags |  (0x1024; 0x1080)
    +---+---+
    |       |  (0xFF00)
    +---+---+
    |CastLib|  Library part of cast reference
    +---+---+
    |CastMmb|  Member-number part of cast reference
    +---+---+ <--- +8
    |       |  (Constant = 0?)
    +---+---+
    |       |  Reference to frame-interval descriptor
    +---+---+
    | PosY  |
    +---+---+
    | PosX  |
    +---+---+
    | Height|
    +---+---+
    | Width |
    +---+---+
    |       | Flags? (0)
    +---+---+
    |       | Flags? (0x0100)
    +---+---+
    |       | ??
    +---+---+
    |       | Flags?
    +---+---+
    :       :
    +---+---+ <--- +48

### Frame interval order

+entry[1]+ contains the bytes of the frame interval order subsection.

Purpose::
Contains a list of the used entries, in order sorted by intervalStart.

### Frame interval descriptors

Frame intervals data is located at offset[3] and forth.
This is a table, addressed by *n* (with *n* divisible by 3).

The *frame interval descriptor* addressed by number *n* consists of
the bytestring triple defined by entry[n], entry[n+1], and entry[n+2]..

Let's call entry *n* the *primary*, entry *n+1* the *secondary* and
entry *n+2* the *tertiary* bytestring of the frame interval descriptor.


##### Frame-interval Primary

    +---+---+---+---+
    | StartFrame    |
    +---+---+---+---+
    | EndFrame      |
    +---+---+---+---+
    |               |  (Constant = 0)
    +---+---+---+---+
    |               |  (Constant = 0)
    +---+---+---+---+
    | SpriteNumber  |
    +---+---+---+---+
    |       |          (Constant = 1)
    +---+---+---+---+
    |               |  (Near-constant = 15 / 0)
    +---+---+---+---+
    |       |          (Near-constant = 57853 / 24973)
    +---+---+---+---+
    |               |  (Constant = 0)
    +---+---+---+---+
    |               |  (Constant = 0)
    +---+---+---+---+
    |               |  (Constant = 0)
    +---+---+---+---+
    |               |  (Constant = 0)
    +---+---+---+---+
    [ Repetition
      +---+---+---+---+
      |               |
      +---+---+---+---+
    ]

##### Frame-interval Secondary

The secondary bytestring lists the frame behaviour scripts associated
with the interval (or sprite channel).

    [Repeat
     +---+---+---+---+
     |CastLib|CastMmb| Reference to cast member CastMmb of cast library CastLib.
     +---+---+---+---+
     |               | Constant = 0
     +---+---+---+---+
    ]

##### Tertiary

The tertiary bytestring is usually empty.
