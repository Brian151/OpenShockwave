
#### Purpose:
# Defines a set of classes (some of them abstract) which give access
# to the sections of a .d*r file.
#

class SectionMap: #------------------------------
    def __init__(self, entries):
        self.entries = entries

    def __repr__(self):
        return repr(self.entries)

    def __getitem__(self,idx):
        return self.entries[idx]

    def entry_by_tag(self, tag):
        for e in self.entries:
            if e.tag == tag:
                return e
        return None

    def kv_iter(self):
        return enumerate(self.entries)
#--------------------------------------------------

class Section:  #------------------------------
    def __init__(self,tag,size):
        self.tag = tag
        self.size = size
        self.the_bytes = None

    def __repr__(self):
        return('%s(%s @?+%d)' % (self.__class__.__name__, self.tag,self.size))

    def bytes(self):
        if self.the_bytes==None:
            self.the_bytes = self.read_bytes()
        return self.the_bytes

    def read_bytes(self):
        raise NotImplementedError()
#--------------------------------------------------

class AssociationTable: #------------------------------
    def __init__(self):
        self.cast_media_by_owner = {}
        self.library_sections_by_owner = {}

    def add_cast_media(self, castmember_section_id, media_id, tag):
        self.cast_media_by_owner.setdefault(castmember_section_id, {})[tag] = media_id

    def add_library_section(self, castlib_assoc_id, owned_id, tag):
        self.library_sections_by_owner.setdefault(castlib_assoc_id, {})[tag] = owned_id

    def get_cast_media(self, castmember_section_id):
        return self.cast_media_by_owner.get(castmember_section_id, {})

    def get_library_sections(self, castlib_assoc_id):
        return self.library_sections_by_owner.get(castlib_assoc_id, {})
#--------------------------------------------------


