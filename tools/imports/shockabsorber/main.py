import sys
import string
import os
import os.path

from shockabsorber.loader import loader
from shockabsorber.debug import debug

def castlib_resolver(rawpath):
    # TODO: This ought to be based on the Cinf section in candidate files.

    # Prune:
    [_1,_2,rawpath] = string.split(rawpath, ":", 2)

    # Adapt to local OS:
    filepath = rawpath.replace(":", os.path.sep)
    print "DB| castlib_resolver: path=<%s>" % filepath

    # Rebase:
    prefix_to_add = os.environ["SHOCKABSORBER_ROOT"]
    if prefix_to_add != None:
        filepath = prefix_to_add + os.path.sep + filepath

    # The actual extension may be different:
    base,ext = os.path.splitext(filepath)
    if ext == ".cst":
        exts_to_try = [".cst", ".cxt"]
    else:
        exts_to_try = [ext]
    castlib_file = None
    for try_ext in exts_to_try:
        try_path = base+try_ext
        if os.path.exists(try_path):
            castlib_file = try_path
            break
        else:
            print "DB| Cast library file does not exist: %s" % try_path
    if castlib_file == None:
        raise Exception("Cast library not found: % s" % filepath)
    else:
        castlib = loader.load_cast_library(castlib_file)
        print "DB| Resolved %s to %s" % (filepath, castlib)
        return castlib

# For now, this is just a test program showing the bitmap images in a file.
def main():
    movie = loader.load_movie(sys.argv[1])
    movie.resolve_cast_libraries(castlib_resolver)

    debug.print_castlibs(movie)
#    debug.show_images(movie)
#    debug.print_spritevectors(movie)
    debug.show_frames(movie)
