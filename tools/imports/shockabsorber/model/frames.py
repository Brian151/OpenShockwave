import struct

class Score: #------------------------------
    """Represents the Score: everything about frames, sprite-channels, and
    sprites."""

    def __init__(self, frame_seq, sprite_table):
        self.frame_seq = frame_seq
        self.sprite_table = sprite_table

    def go_to_frame(self, where):
        self.frame_seq.go_to_frame(where)

    def get_sprite(self, sprite_nr):
        # TODO: Should sprite objects have more identity?
        return self.frame_seq.get_sprite(sprite_nr)
#--------------------------------------------------

class FrameCursor: #------------------------------
    """
    Computed properties:
    - current_frame_nr is a frame number which can be changed.

    - sprite_vector is the bytes containing the sprite-info as of the
      current frame.

    """
    def __init__(self, frame_seq):
        self.frame_seq = frame_seq
        self.reset_sprite_vector()
        self.go_to_frame(1)

    def reset_sprite_vector(self):
        self.current_frame_nr = -1
        size = self.frame_seq.sprite_count * self.frame_seq.sprite_size
        self.sprite_vector = bytearray(size)

    def get_current_frame_nr(self):
        return self.current_frame_nr + 1

    def go_to_frame(self, where):
        where -= 1 # Adjust: array is 0-based
        if self.current_frame_nr > where:
            # Could perhaps optimize this.
            self.reset_sprite_vector()
        while self.current_frame_nr < where:
            self.current_frame_nr += 1
            self.frame_seq.apply_delta_to(self.current_frame_nr, self.sprite_vector)

    def get_sprite(self, sprite_nr):
        return Sprite(sprite_nr, self.get_raw_sprite(sprite_nr))

    def get_raw_sprite(self, sprite_nr):
        sprite_size = self.frame_seq.sprite_size
        offset = sprite_nr * sprite_size
        return self.sprite_vector[offset : offset+sprite_size]

    def get_frame_scripts(self):
        return self.frame_seq.frame_script_list[self.current_frame_nr]

#--------------------------------------------------

class FrameSequence: #------------------------------
    """Represents the sprite-info for each sprite for each channel.

    Given properties:
    - frame_list is a list of FrameDelta objects, one for each frame
        in order.

    - channel_count is the total number of sprite channels.

    - sprite_size is the size of each sprite, in bytes.
    """

    def __init__(self, sprite_count, sprite_size, frame_delta_list, frame_script_list):
        self.sprite_count = sprite_count
        self.sprite_size = sprite_size
        self.frame_delta_list = frame_delta_list
        self.frame_script_list = frame_script_list

    def frame_count(self):
        return len(self.frame_delta_list)

    def create_cursor(self):
        return FrameCursor(self)

    def apply_delta_to(self, fnr, target):
        self.frame_delta_list[fnr].apply_to(target)

#--------------------------------------------------

class FrameDelta: #------------------------------
    def __init__(self, items):
        self.items = items

    def apply_to(self, target):
        for item in self.items:
            item.apply_to(target)
#--------------------------------------------------

class FrameDeltaItem: #------------------------------
    def __init__(self, start, bytes):
        self.start = start
        self.bytes = bytes

    def apply_to(self, target):
        target[self.start:self.start + len(self.bytes)] = self.bytes
#--------------------------------------------------

class Sprite: #------------------------------
    def __init__(self, nr, raw):
        self.nr = nr
        self.set_bytes(raw)

    def set_bytes(self,raw):
        self.raw = raw
        [flags1, v2, castlib, castmember, v5, interval_ref,
         posY, posX, height, width,
         v11, v12, v13, v14, v15, v16
        ] = struct.Struct('>16h').unpack_from(buffer(raw), 0)
        rest = raw[16:]
        ink = flags1 & 63; flags1 &=~63

        self.member_ref = (castlib, castmember)
        self.interval_ref = interval_ref
        self.pos = (posX, posY)
        self.size = (width,height)
        self.ink = ink
        self.extras = [flags1, v2, v5, v11, v12, v13, v14, v15, v16, rest]

    def get_pos(self): return self.pos
    def get_size(self): return self.size

    def __repr__(self):
        return "<Sprite #%d member=%s ref=%s pos=%s size=%s ink=%d extras=%s>" % (
            self.nr, self.member_ref, self.interval_ref,
            self.pos, self.size, self.ink, self.extras)
#--------------------------------------------------
