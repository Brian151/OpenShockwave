Section "LctX"
--------------

Purpose of section::
Collecting node for a number of scripts.
Is associated with a cast library or movie.

Related sections::

- "Lscr" -- A script.

### Format

    +========+==========+===============+
    | Header | Handlers | ScriptEntries |
    +========+==========+===============+

### Header

    +---+---+---+---+
    |               | Constant = 0
    +---+---+---+---+
    |               | Constant = 0
    +---+---+---+---+
    |  EntryCount   |
    +---+---+---+---+
    |  EntryCount2  | Always equal to EntryCount?  UnusedHead minus 1?
    +---+---+---+---+
    | Offset| Usually = 96
    +---+---+
    |       | EntrySize? Constant = 12
    +---+---+---+---+
    |               | Constant = 0
    +---+---+---+---+
    |               | 1 for movie; 3 for cast library file.
    +---+---+---+---+
    |               | Constant = -1
    +---+---+---+---+
    | NamesSectionID| Reference to "Lnam" section
    +---+---+---+---+
    |ValidCnt|        Number of valid entries
    +---+---+
    |       |         (Flags? Observed: 1,4,5,13)
    +---+---+
    |FreePtr|         First free entry in free-list.
    +---+---+

### Handlers

This part, which lasts from the end of the header and up to +Offset+
into the section, appears to contain names of movie-level hooks.

    [ Repetition 27(?) times  (up till Offset)
      +---+---+
      |Name   |
      +---+---+
    ]

Here, +Name+ is a name index of the name of a handler -- or -1 to
indicate "no handler".
The 14th and 15th entry in this table are for the "start movie" and
"stop movie" handlers, respectively.

### ScriptEntries

This is a table of EntryCount items.  Only ValidCnt ones are valid.
The rest usually have SectionID=-1 and UsedFlag=0.
Furthermore, the unused (free) entries make up a singly-linked list, starting
(usually?) with the last entry. Table indexing is zero-based.

    [ Repetition EntryCount times
      // Entry:
      +---+---+---+---+
      |               | ??
      +---+---+---+---+
      | SectionID     | Reference to "Lscr" section
      +---+---+---+---+
      |UsedFlag|         Near-constant: 4 for used, 0 for unused entry.
      +---+---+
      | Link  |         For unused entries: link to next unused, or -1.
      +---+---+
    ]
