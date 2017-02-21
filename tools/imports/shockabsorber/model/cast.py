class CastLibraryTable: #------------------------------
    def __init__(self, castlibs):
        self.by_nr = {}
        self.by_assoc_id = {}
        for cl in castlibs:
            self.by_nr[cl.nr] = cl
            if cl.assoc_id>0:
                self.by_assoc_id[cl.assoc_id] = cl

    def iter_by_nr(self):
        return self.by_nr.itervalues()

    def get_cast_library(self, lib_nr):
        return self.by_nr[lib_nr]

    def get_cast_member(self, lib_nr, member_nr):
        cast_lib = self.by_nr[lib_nr]
        return cast_lib.get_cast_member(member_nr) if cast_lib != None else None
#--------------------------------------------------

class CastLibrary: #------------------------------
    def __init__(self, nr, name, path, assoc_id, idx_range, self_idx):
        self.nr = nr
        self.name = name
        self.path = path
        self.assoc_id = assoc_id
        self.idx_range = idx_range
        self.self_idx = self_idx
        self.castmember_table = None

    def __repr__(self):
        return "<CastLibrary #%d name=\"%s\" size=%d>" % (self.nr, self.name,
                                                          len(self.castmember_table) if self.castmember_table != None else -1)

    def get_path(self): return self.path
    def castmember_table_is_set(self): return self.castmember_table != None
    def get_castmember_table(self): return self.castmember_table

    def set_castmember_table(self,table):
        self.castmember_table = table

    def get_cast_member(self, member_nr):
        if self.castmember_table == None: return None # TODO: Ensure loaded
        return self.castmember_table[member_nr-1]
#--------------------------------------------------
