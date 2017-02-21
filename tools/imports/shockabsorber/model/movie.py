class Movie: #------------------------------
    def __init__(self, castlibs, frames, scripts):
        self.castlibs = castlibs
        self.frames = frames
        self.scripts = scripts

    def resolve_cast_libraries(self, resolver):
        for cl in self.castlibs.iter_by_nr():
            print "DB| resolve_cast_libraries: cl=%s" % cl
            path = cl.get_path()
            if path != None and not cl.castmember_table_is_set():
                print "DB| resolve_cast_libraries: cl #%d: path=%s" % (cl.nr, path)
                castlib = resolver(path)
                cl.set_castmember_table(castlib.get_castmember_table())
#--------------------------------------------------
