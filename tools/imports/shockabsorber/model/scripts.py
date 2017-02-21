#### Purpose:
# Script-related data structures
#

class ScriptNames: #------------------------------
    def __init__(self, entries, misc):
        self.entries = entries
        self.misc = misc

    def __repr__(self):
        entry_map = {}
        for idx,e in enumerate(self.entries):
            entry_map[idx] = e
        return repr(entry_map)

    def __getitem__(self,idx):
        return self.entries[idx]
#--------------------------------------------------
