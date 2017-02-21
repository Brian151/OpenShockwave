Section "Lscr"
--------------

Purpose of section::
Contains scripts (which are collections of functions).

Related sections::

- "LctX" -- Script collection
- "Lnam" -- Names used in scripts

### Format

    +========+       +================+    +===========+
    | Header |--+--->| Function table |--->| Functions |
    +========+  |    +================+    +===========+
                |\   +=========+
                | -->| Globals |
                |    +=========+
                |\   +============+
                | -->| Properties |
                |    +============+
                |\   +================+
                | -->| Handler vector |
                |    +================+
                |\   +==========+
                | -->| Literals |
                |    +==========+
                |          v
                 \   +================+
                  -->| Literal data   |
                     +================+

#### Header

    +---+---+---+---+== +0
    |               |  Constant = 0
    +---+---+---+---+
    |               |  Constant = 0
    +---+---+---+---+
    | TotalLength   |  Effective length of section
    +---+---+---+---+
    | TotalLength2  |  Equal to TotalLength
    +---+---+---+---+== +16
    | HdrLen|          Header length? (=92)
    +---+---+
    | ScrNr |          Script number (0, ...)
    +---+---+
    |       |          ?? (Same for all scripts in a file; observed: 2-8)
    +---+---+---+---+== +22
    |               |  Constant = -1
    +---+---+---+---+
    |               |  Constant = 0
    +---+---+---+---+
    |               |  ??
    +---+---+---+---+
    |               |  Constant = 0
    +---+---+---+---+
    |               |  Script type: 0: behaviour, 2: global script.
    +---+---+---+---+
    |               |  Constant = 1 // varnames_count?
    +---+---+---+---+== +46
    |       |          ?? (1-??) (ScriptID2)
    +---+---+
    |       |          ??
    +---+---+---+---+---+---+== +50
    |HVecLen|HVecOffset     |  For handler vector
    +---+---+---+---+---+---+
    | HandlerVectorFlags    |
    +---+---+---+---+---+---+== +60
    | PCount| POffset       |  For list of names of properties.
    +---+---+---+---+---+---+
    | GCount| GOffset       |  For list of names of globals.
    +---+---+---+---+---+---+
    | FCount| FOffset       |  For list of functions.
    +---+---+---+---+---+---+
    | LCount| LOffsetOffset |  For list of literals (offset table).
    +---+---+---+---+---+---+---+---+== +84
    | LLength       | LOffset       |  For list of literals (content).
    +---+---+---+---+---+---+---+---+== +92

#### Globals

This part contains a table of the global variables references by the script.
Indexes into the globals table are zero-based.

    +== From GOffset
    [ Repeat GCount times
      +---+---+
      | Name  |  Reference to name in name-table (from "Lnam" section)
      +---+---+
    ]

#### Properties

This part contains a table of the property variables references by the script.
Indexes into the properties table are zero-based.

    +== From POffset
    [ Repeat PCount times
      +---+---+
      | Name  |  Reference to name in name-table (from "Lnam" section)
      +---+---+
    ]

#### Literals

This part contains literals used in the code of the script.
It consists of two parts: an offset table (with fixed-size entries),
and a content table (with variable-size entries) into which those offsets point.
Indexes into the literals table are zero-based.

##### Literals offset table

    +== From LOffsetOffset
    [ Repeat LCount times
      +---+---+
      | Type  |  Type of literal, see below.
      +---+---+
      | Offset|  Location of literal value, relative to LOffset
      +---+---+
    ]

The Type field is the type (and encoding method) of the literal value
in question.  Its meaning is:

[cols=2]
|==============================
| Type | Meaning
| 1    | String (NUL-terminated)
| 9    | Double (IEEE-754 double precision)
|==============================


##### Literals content table

The contents of the *i*th literal is stored as follows:

    +---+---+---+---+== From LOffset + LiteralOffsetsTable[i].Offset
    | Length        |        Length in bytes of the literal data.
    +---+---+---+---+
    +=====================+
    | Data (Length bytes) |  To be interpreted according to
    +=====================+  the Type of the literal.

#### Handler vector

The handler vector indicates which standard handlers are present in the script,
and their function numbers.

HandlerVectorFlags is a bitmask which indicates the presence of handlers:

[cols=2]
|==============================
|  Nr. | Bit    | Meaning
|    0 |    0x1 | mouseDown
|    1 |    0x2 | mouseUp
|    2 |    0x4 | ??keyDown??
|    3 |    0x8 | keyUp
|    4 |   0x10 | ??
|    5 |   0x20 | prepareFrame
|    6 |   0x40 | ??
|    7 |   0x80 | mouseEnter
|    8 |  0x100 | mouseLeave
|    9 |  0x200 | mouseWithin
|    0 |  0x400 | ?
|   11 |  0x800 | startMovie
|   12 | 0x1000 | stopMovie
|   13 | 0x2000 | ??
|   14 | 0x4000 | ??
|   15 | 0x8000 | exitFrame
|==============================

The handler vector itself contains the function numbers corresponding
to the handlers:

    +== From HVecOffset
    [ Repeat HVecLen times
      +---+---+
      | FunNr |  Function number of handler in script
      +---+---+
    ]

#### Functions

A script consists (primarily) of a number of functions.
The root of information about the functions of a script is
the *function table*. The function table has an entry for each function of the script, and contains both some fixed-size information about a
function and pointers to regions which contain the actual function
code and other variable-size properties of the function.

    +================+       +==============+
    | Function table |--+--->| Instructions |
    +================+  |    +==============+
                        |\   +=================+
                        | -->| Parameter names |
                        |    +=================+
                        |\   +==========================+
                        | -->| Names of local variables |
                        |    +==========================+
                         \   +=========================+
                          -->| Line number information |
                             +=========================+

##### Function table

    [ Repetition FCount times
      +---+---+
      | Name  |  Reference to the code-name (in the names table) of the function
      +---+---+
      |Handler|  Position in handler vector, or -1 if not a standard handler.
      +---+---+---+---+
      | CodeLength    |  Code length, in bytes.
      +---+---+---+---+
      | CodeOffset    |  Code offset in section.
      +---+---+---+---+---+---+
      |ArgCnt | ArgNamesOffset|  For table of argument names.
      +---+---+---+---+---+---+
      |LocCnt | LocNamesOffset|  For table of names of local variables.
      +---+---+---+---+---+---+
      |XCnt   | XOffset       |  (Some usually-empty table.)
      +---+---+---+---+---+---+
      |               |  ??
      +---+---+---+---+
      |       |          ??
      +---+---+---+---+---+---+
      |LineCnt| LinesOffset   |  For table of line number information.
      +---+---+---+---+---+---+
      | StackHeight   |          Maximal amount of stack used by function.
      +---+---+---+---+
    ]
