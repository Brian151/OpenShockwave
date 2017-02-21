Section "Lnam"
--------------

Purpose of section::
Contains names used in scripts.

Related sections::

- "LctX" -- Script collection
- "Lscr" -- Scripts

### Format

    +========+=============+
    | Header | Names table |
    +========+=============+

#### Header

    +---+---+---+---+
    |               |  Constant = 0
    +---+---+---+---+
    |               |  Constant = 0
    +---+---+---+---+
    | NamesLength   |  Length of names table
    +---+---+---+---+
    | NamesLength2  |  Usually equal to NamesLength
    +---+---+---+---+
    | Offset|          Start of names table, relative to section start (=20)
    +---+---+
    | Count |          Number of names.
    +---+---+

#### Names table
The names table is a table of strings. Indexing is zero-based.

    [ Repetition Count times:
      +---+
      |Len|          Name length
      +---+
      +====+
      |Name|         The name: Len bytes.
      +====+
    ]

