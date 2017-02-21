Logical structure
-----------------

The entities defined in a movie file are related to each other through
various tables.
An attempt at describing these relations are given in this chapter.

### File sections
File sections are a synthetic (non-domain) concept.
A section consists of a sequence of bytes.

The locations and access methods of the file sections are described in
the *section map*. The exact details of this map differs between the
DXR and DCR envelope types.

                    +-------------+
     section-id --->| Section map |---> section type (tag)
                    |             |---> section bytes
                    +-------------+

### Cast libraries

Cast libraries are a domain concept.
Each cast library consists of a number of cast members.

                   +--------------------+
    library-id --->| Cast library table |---> library name
                   |     ("MCsL")       |---> library association id
                   |                    |       OR
                   |                    |       path
                   |                    |---> (start/end cast ids)
                   +--------------------+

                               +-------------------+
    library-association-id --->| Association table |---> Cast list section
                               +-------------------+

### Cast members

Cast members are a domain concept.
Cast members belong to a cast library.

    library-id ---+
                  v
      library-association-id ---+
                                v
                +-------------------+
    cast-id --->| Cast list section |---> section-id of cast entity
                |     ("CAS*")      |
                +-------------------+

                                  +-------------------+
    section-id of cast entity --->| Association table |---> section-ids of media
                                  +-------------------+

    section-id of cast entity ---+
                                 v
                        +---------------+
                        | Cast metadata |---> cast member name
                        |    ("CASt")   |---> cast member type
                        |               |---> cast type specific metadata
                        +---------------+

### Frames

Frames are a domain concept.
A frames is a point-in-time of the movie, and are numbered from 1 and upward.
A frame may have a label (which is a string).

                     +-------------------+
    frame-number --->| Frame label table |---> frame-label (optional)
                     |     ("VWLB")      |
                     +-------------------+
