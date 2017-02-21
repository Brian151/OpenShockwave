Singletons
----------

### Section association table

The section tagged "KEY*" is the *section association table*.
It is one of the structure-providing sections.
It connects cast member metadata sections with sections containing the
actual data for the cast members, and it connects cast libraries with
sections containing data about the cast library.

#### Syntax

    KeysSection ::= <KeysHeader> <KeysTable>
    KeysHeader ::=  <?:16> <?:16> <entry_count:32> <?:32>
    KeysTable ::= KeysEntry*(entry_count)

    KeysEntry ::= <section_id:32> <cast_section_id:32> <section_tag:tag>


### Cast libraries table
