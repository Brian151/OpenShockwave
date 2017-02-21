Section "SCRF"
--------------

Purpose of section::
Cast-member-to-section-number mapping for external cast libraries.
This section appears to be redundant, as the external library's "CAS*"
section can be used instead.

Related sections::
"CAS*" -- Cast-member-to-section-number mapping for internal cast libraries.

### Format

    +========+==============+
    | Header | MappingTable |
    +========+==============+

#### Header

    +---+---+---+---+
    |               |  Constant = 0?
    +---+---+---+---+
    |               |  Constant = 0?
    +---+---+---+---+
    | EntryCount    |  Size of cast-member-to-section-number table
    +---+---+---+---+
    | ValidCount?   |
    +---+---+---+---+
    |       |          Constant = 0x0018?
    +---+---+
    |       |          Constant = 0x0008?
    +---+---+---+---+
    |               |  Constant = 0xbb94'e6a0?
    +---+---+---+---+

#### Mapping table

    [ Repetition EntryCount times:
      +---+---+
      | Member|          Cast member number
      +---+---+---+---+
      | SectionID     |  Section ID in external library
      +---+---+---+---+
    ]
