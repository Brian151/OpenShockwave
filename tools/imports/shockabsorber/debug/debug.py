import pyglet
import pyglet.text
import shockabsorber.loader.rle
from pyglet.gl import *

def print_castlibs(movie):
    for cl in movie.castlibs.iter_by_nr():
        print "==== Cast library \"%s\": ====" % (cl.name,)
        if cl.castmember_table==None: continue

        for i,cm in enumerate(cl.castmember_table):
            if cm==None: continue
            print "Cast table entry #%d: %s" % (i,cm)

def print_spritevectors(movie):
    frames = movie.frames
    if frames==None: return
    cursor = frames.create_cursor()
    for fnr in range(1,1+frames.frame_count()):
        print "==== Frame #%d: ====" % fnr
        cursor.go_to_frame(fnr)

        for scr in cursor.get_frame_scripts():
            ((libnr,memnr),extra) = scr
            scr_member = movie.castlibs.get_cast_member(libnr, membernr)
            print "  -> Script %s: %s (%d)" % ((libnr,memnr), scr_member.name, extra)

        for snr in range(frames.sprite_count):
            raw_sprite = cursor.get_raw_sprite(snr)
            if raw_sprite != bytearray(len(raw_sprite)):
                sprite = cursor.get_sprite(snr)
                print "---- Sprite #%d:" % snr
                print "  raw=<%s>" % raw_sprite
                print "  %s" % sprite
                if sprite.interval_ref > 0:
                    (castnr, membernr) = sprite.member_ref
                    member = movie.castlibs.get_cast_member(castnr, membernr)
                    print "  -> member: %s" % member
                    if sprite.ink == 9:
                        member2 = movie.castlibs.get_cast_member(castnr, membernr+1)
                        if member2 != None:
                            print "  -> mask: %s" % (member2.name)

def show_images(movie):
    images = []
    for cl in movie.castlibs.iter_by_nr():
        print "==== Cast library \"%s\": ====" % (cl.name,)
        if cl.castmember_table==None: continue

        for i,cm in enumerate(cl.castmember_table):
            if cm==None: continue
            print "%d: Loading image \"%s\"" % (i, cm.name)
            if not 'BITD' in cm.media: continue
            castdata = cm.castdata
            media = cm.media['BITD']
            (w,h) = castdata.dims
            (tw,th) = castdata.total_dims
            bpp = castdata.bpp
            image = shockabsorber.loader.rle.rle_to_image(w,h, tw, bpp, media.data)
            images.append(image)
            if len(images)>50: break
    print "Image count: %d" % len(images)

    W = 8000; H = 1200
    window = pyglet.window.Window(width=W, height=H)

    @window.event
    def on_draw():
        window.clear()

        y = 0; x=0; maxw = 0
        for img in images:
            w = img.width
            h = img.height
            if y+h>=H:
                y = 0; x+= maxw + 20; maxw = 0
                if x>=W: break
            img.blit(x,y)
            if w>maxw: maxw = w
            y += h + 20

    pyglet.app.run()


def show_frames(movie):
    if movie.frames==None:
        print "==== (No score.) ===="
        return

    def rle_decode_member(member):
        if not 'BITD' in member.media: return None
        castdata = member.castdata
        media = member.media['BITD']
        (w,h) = castdata.dims
        (tw,th) = castdata.total_dims
        bpp = castdata.bpp
        return shockabsorber.loader.rle.rle_decode(w,h, tw, bpp, media.data)

    loaded_images = {}
    def get_image(member_ref, ink):
        cache_key = (member_ref,ink)
        if not (cache_key in loaded_images):
            (libnr, membernr) = member_ref
            member = movie.castlibs.get_cast_member(libnr, membernr)
            if ink != 9: # not Mask
                image = shockabsorber.loader.rle.bytes_to_image(rle_decode_member(member))
            else:
                mask_member = movie.castlibs.get_cast_member(libnr, membernr+1)
                image_data = rle_decode_member(member)
                mask_data = rle_decode_member(mask_member)
                print "DB| Masked-ink sprite: %s / %s" % (member.name, mask_member.name)
                image = shockabsorber.loader.rle.bytes_and_mask_to_image(image_data, mask_data)
            loaded_images[cache_key] = image
        return loaded_images[cache_key]


    cursor = movie.frames.create_cursor()
    def draw_frame(fnr):
        print "==== Frame #%d ====" % fnr
        cursor.go_to_frame(fnr)
        for snr in range(movie.frames.sprite_count):
            sprite = cursor.get_sprite(snr)
            if sprite.interval_ref > 0:
                (libnr, membernr) = sprite.member_ref
                member = movie.castlibs.get_cast_member(libnr, membernr)
                if member!=None and member.type==1:
                    image = get_image(sprite.member_ref, sprite.ink)
                    if image==None:
                        #print "DB| image==None for member_ref %s" % (sprite.member_ref,)
                        continue
                    (posX,posY) = sprite.get_pos()
                    (szX,szY) = sprite.get_size()
                    (ancY, ancX) = member.castdata.get_anchor()
                    bltX = posX-ancX; bltY = 768-(posY-ancY)
                    #print "DB| blit: name=%s pos=%s anchor=%s size=%s blitpos=%s" % (
                    #    member.get_name(), (posX,posY), (ancX,ancY), (szX,szY), (bltX,bltY))
                    image.blit(bltX, bltY-szY)

    W = 1024; H = 768
    window = pyglet.window.Window(width=W, height=H)
    glEnable(GL_BLEND)
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)

    fnr_label = pyglet.text.Label(font_size=30, x=25, y=25, color=(255,255,0,0))

    ani_state = {"fnr": 1}
    @window.event
    def on_draw():
        window.clear()
        draw_frame(ani_state["fnr"])
        fnr_label.draw()

    def update(dt):
        ani_state["fnr"] += 1
        fnr = ani_state["fnr"]
        fnr_label.text = "Frame %d" % fnr
        on_draw()

    pyglet.clock.schedule_interval(update, 0.1)

    pyglet.app.run()
