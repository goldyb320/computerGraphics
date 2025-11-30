import sys
from PIL import Image

def main():
    if len(sys.argv) < 2:
        print("input")
        sys.exit(1)

    #read lines, drop blank-only ones (took embarassingly long to figure out how to do this first line right lol)
    with open(sys.argv[1], "r", encoding="ascii", errors="ignore") as f:
        lines = [ln.strip() for ln in f if ln.strip()]

    image = None
    filename = None
    pos_buf = []
    col_buf = []

    for line in lines:
        parts = line.split()
        key = parts[0]

        if key == "png":
            w, h, filename = int(parts[1]), int(parts[2]), parts[3]
            image = Image.new("RGBA", (w, h), (0, 0, 0, 0))

        elif key == "position":
            nums = list(map(int, parts[2:]))
            pos_buf = [(nums[i], nums[i+1]) for i in range(0, len(nums), 2)]

        elif key == "color":
            nums = list(map(int, parts[2:]))
            col_buf = [(nums[i], nums[i+1], nums[i+2], nums[i+3])
                       for i in range(0, len(nums), 4)]

        elif key == "drawPixels":
            n = int(parts[1])
            #per note, use image.im.putpixel
            px = image.im
            for i in range(n):
                x, y = pos_buf[i]
                r, g, b, a = col_buf[i]
                px.putpixel((x, y), (r, g, b, a))
        #ignore unknown keywords
    if image and filename:
        image.save(filename)
        print(f"Wrote {filename}")
    else:
        print("No png header found")
        sys.exit(2)

if __name__ == "__main__":
    main()
