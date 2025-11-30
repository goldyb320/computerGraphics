import sys
import math
from typing import List, Tuple, Optional
from PIL import Image


class Vector3:
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z
    
    def __add__(self, other):
        return Vector3(self.x + other.x, self.y + other.y, self.z + other.z)
    
    def __sub__(self, other):
        return Vector3(self.x - other.x, self.y - other.y, self.z - other.z)
    
    def __mul__(self, scalar):
        return Vector3(self.x * scalar, self.y * scalar, self.z * scalar)
    
    def __rmul__(self, scalar):
        return self.__mul__(scalar)
    
    def dot(self, other):
        return self.x * other.x + self.y * other.y + self.z * other.z
    
    def length(self):
        return math.sqrt(self.x * self.x + self.y * self.y + self.z * self.z)
    
    def normalize(self):
        length = self.length()
        if length == 0:
            return Vector3(0, 0, 0)
        return Vector3(self.x / length, self.y / length, self.z / length)
    
    def cross(self, other):
        return Vector3(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x
        )


class Ray:
    def __init__(self, origin, direction):
        self.origin = origin
        self.direction = direction


class Sphere:
    def __init__(self, center, radius, color, texture=None):
        self.center = center
        self.radius = radius
        self.color = color
        self.texture = texture


class Sun:
    def __init__(self, direction, color):
        self.direction = direction
        self.color = color


class Plane:
    def __init__(self, a, b, c, d, color):
        self.a = a
        self.b = b
        self.c = c
        self.d = d
        self.color = color


class Triangle:
    def __init__(self, v0, v1, v2, color, texture=None):
        self.v0 = v0
        self.v1 = v1
        self.v2 = v2
        self.color = color
        self.texture = texture


class Intersection:
    def __init__(self, t, point, normal, sphere):
        self.t = t
        self.point = point
        self.normal = normal
        self.sphere = sphere


def linearToSrgb(linear):
    #srgb<-lin
    if linear <= 0.0031308:
        return 12.92 * linear
    else:
        return 1.055 * (linear ** (1.0 / 2.4)) - 0.055


def srgbToLinear(srgb):
    #lin<-srgb
    if srgb <= 0.04045:
        return srgb / 12.92
    else:
        return ((srgb + 0.055) / 1.055) ** 2.4


def clamp(value, min_val, max_val):
    #clamp value between min and max
    return max(min_val, min(max_val, value))


def hitSphere(ray, sphere):
    #ray vs sphere
    ro = ray.origin
    r_d = ray.direction
    c = sphere.center
    r = sphere.radius
    
    #check if ray origin inside sphere
    oc = ro - c
    oc_squared = oc.dot(oc)
    r_squared = r * r
    inside = oc_squared < r_squared
    
    #calculate distance along ray to closest approach to center
    r_d_length = r_d.length()
    if r_d_length == 0:
        return None
    
    c_minus_ro = c - ro
    t_c = c_minus_ro.dot(r_d) / r_d_length
    
    #if ray origin outside and t_c < 0, no intersection
    if not inside and t_c < 0:
        return None
    
    #calculate d^2
    closest_point = ro + r_d * t_c
    d_vec = closest_point - c
    d_squared = d_vec.dot(d_vec)
    
    #if ray origin outside and r^2 < d^2, no intersection
    if not inside and r_squared < d_squared:
        return None
    
    #calculate t_offset
    if r_squared < d_squared:
        return None
    
    t_offset = math.sqrt(r_squared - d_squared) / r_d_length
    
    #calculate intersection t value
    if inside:
        t = t_c + t_offset
    else:
        t = t_c - t_offset
    
    #only return if t is positive
    if t <= 0:
        return None
    
    #calculate intersection point and normal
    point = ro + r_d * t
    normal = (point - c).normalize()
    
    return Intersection(t=t, point=point, normal=normal, sphere=sphere)


def hitPlane(ray, plane):
    #ray vs plane
    a = plane.a
    b = plane.b
    c = plane.c
    d = plane.d
    n = Vector3(a, b, c)
    denom = n.dot(ray.direction)
    if abs(denom) < 1e-12:
        return None
    t = -(a * ray.origin.x + b * ray.origin.y + c * ray.origin.z + d) / denom
    if t <= 0:
        return None
    point = ray.origin + ray.direction * t
    normal = n.normalize()
    return Intersection(t=t, point=point, normal=normal, sphere=plane)


def hitTri(ray, tri):
    #moller-trumbore
    v0 = tri.v0
    v1 = tri.v1
    v2 = tri.v2
    edge1 = v1 - v0
    edge2 = v2 - v0
    pvec = ray.direction.cross(edge2)
    det = edge1.dot(pvec)
    if abs(det) < 1e-12:
        return None
    inv_det = 1.0 / det
    tvec = ray.origin - v0
    u = tvec.dot(pvec) * inv_det
    if u < 0.0 or u > 1.0:
        return None
    qvec = tvec.cross(edge1)
    v = ray.direction.dot(qvec) * inv_det
    if v < 0.0 or u + v > 1.0:
        return None
    t = edge2.dot(qvec) * inv_det
    if t <= 0:
        return None
    point = ray.origin + ray.direction * t
    normal = edge1.cross(edge2).normalize()
    return Intersection(t=t, point=point, normal=normal, sphere=tri)


def findHit(ray, spheres, planes=None, triangles=None, exclude_sphere=None, min_t_threshold=0.0):
    #closest hit
    closest = None
    min_t = float('inf')
    if planes is None:
        planes = []
    if triangles is None:
        triangles = []

    for sphere in spheres:
        if exclude_sphere is not None and sphere is exclude_sphere:
            continue
        intersection = hitSphere(ray, sphere)
        if intersection and intersection.t > min_t_threshold and intersection.t < min_t:
            min_t = intersection.t
            closest = intersection
    for plane in planes:
        if exclude_sphere is not None and plane is exclude_sphere:
            continue
        intersection = hitPlane(ray, plane)
        if intersection and intersection.t > min_t_threshold and intersection.t < min_t:
            min_t = intersection.t
            closest = intersection
    for tri in triangles:
        if exclude_sphere is not None and tri is exclude_sphere:
            continue
        intersection = hitTri(ray, tri)
        if intersection and intersection.t > min_t_threshold and intersection.t < min_t:
            min_t = intersection.t
            closest = intersection
    
    return closest


def shadeRay(ray, spheres, suns, x=None, y=None, width=None, height=None):
    #shade ray
    global _planes_for_tracing
    planes = _planes_for_tracing if '_planes_for_tracing' in globals() else []
    triangles = _triangles_for_tracing if '_triangles_for_tracing' in globals() else []
    intersection = findHit(ray, spheres, planes, triangles)
    
    if intersection is None:
        #background is transparent
        return None
    
    #make objects flip normal if pointing away from ray
    normal = intersection.normal
    if ray.direction.dot(normal) > 0:
        normal = normal * -1
    
    def get_base_color():
        obj = intersection.sphere
        #Sphere texturing via latitude/longitude
        if isinstance(obj, Sphere) and getattr(obj, 'texture', None) is not None:
            n = (intersection.point - obj.center).normalize()
            lon = math.atan2(n.x, -n.z)  # [-pi, pi]
            u = (lon + math.pi) / (2.0 * math.pi)
            lat = math.asin(clamp(n.y, -1.0, 1.0))  # [-pi/2, pi/2]
            v = 0.5 - lat / math.pi
            #wrap u, clamp v
            u = u % 1.0
            v = min(1.0, max(0.0, v))
            img = obj.texture
            w, h = img.size
            #nearest sample
            xi = int(u * (w - 1))
            yi = int(v * (h - 1))
            r, g, b = img.getpixel((xi, yi))
            return Vector3(srgbToLinear(r / 255.0), srgbToLinear(g / 255.0), srgbToLinear(b / 255.0))
        #solid color
        return obj.color
    
    base_color = get_base_color()
    
    #compute lighting using lambert's law
    color = Vector3(0, 0, 0)
    
    for sun in suns:
        #shadow ray
        light_dir = sun.direction.normalize()
        #shadow bias
        shadow_bias = 1e-4
        shadow_ray = Ray(
            origin=intersection.point + normal * shadow_bias,
            direction=light_dir
        )
        
        #check for shadow
        shadow_intersection = findHit(
            shadow_ray, spheres, planes, triangles, exclude_sphere=intersection.sphere, min_t_threshold=0.0
        )
        
        if shadow_intersection is None:
            #not in shadow, add lighting
            lambert = max(0, normal.dot(light_dir))
            #lambert's law
            contribution = Vector3(
                base_color.x * sun.color.x * lambert,
                base_color.y * sun.color.y * lambert,
                base_color.z * sun.color.z * lambert
            )
            color = color + contribution
    
    return color


def generateRay(x, y, width, height, eye, forward, right, up, camera_mode='pinhole'):
    #make ray
    if camera_mode == 'fisheye':
        #ellipse that fits the whole image
        sx = (2 * x - width) / width
        sy = (height - 2 * y) / height
        r2 = sx * sx + sy * sy
        if r2 > 1.0:
            return None
        #use sqrt(1 - sx^2 - sy^2) as forward weight
        forward_norm = forward.normalize()
        z = math.sqrt(max(0.0, 1.0 - r2))
        direction = right * sx + up * sy + forward_norm * z
        direction = direction.normalize()
        return Ray(origin=eye, direction=direction)
    
    if camera_mode == 'panorama':
        sx = (2 * x - width) / width
        sy = (height - 2 * y) / height
        lon = math.pi * sx
        lat = (math.pi * 0.5) * sy
        
        forward_norm = forward.normalize()
        #basis is (right, up, forward)
        cos_lat = math.cos(lat)
        sin_lat = math.sin(lat)
        cos_lon = math.cos(lon)
        sin_lon = math.sin(lon)
        direction = (forward_norm * cos_lon + right * sin_lon) * cos_lat + up * sin_lat
        direction = direction.normalize()
        return Ray(origin=eye, direction=direction)
    
    #pinhole camera
    sx = (2 * x - width) / max(width, height)
    sy = (height - 2 * y) / max(width, height)
    direction = forward + right * sx + up * sy
    direction = direction.normalize()
    return Ray(origin=eye, direction=direction)


def parseFile(filename):
    #parse scene
    width = 0
    height = 0
    output_filename = ""
    spheres = []
    planes = []
    triangles = []
    vertices = []  #for xyz
    suns = []
    exposure = None
    eye = None
    forward = None
    up = None
    camera_mode = 'pinhole'
    current_texture = None  # PIL image or None
    
    #state
    current_color = Vector3(1, 1, 1)
    
    with open(filename, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            parts = line.split()
            if not parts:
                continue
            
            keyword = parts[0]
            
            if keyword == 'png':
                width = int(parts[1])
                height = int(parts[2])
                output_filename = parts[3]
            
            elif keyword == 'expose':
                exposure = float(parts[1])
            
            elif keyword == 'eye':
                ex = float(parts[1])
                ey = float(parts[2])
                ez = float(parts[3])
                eye = Vector3(ex, ey, ez)
            
            elif keyword == 'forward':
                fx = float(parts[1])
                fy = float(parts[2])
                fz = float(parts[3])
                forward = Vector3(fx, fy, fz)
            
            elif keyword == 'up':
                ux = float(parts[1])
                uy = float(parts[2])
                uz = float(parts[3])
                up = Vector3(ux, uy, uz)
            
            elif keyword == 'color':
                r = float(parts[1])
                g = float(parts[2])
                b = float(parts[3])
                current_color = Vector3(r, g, b)
            
            elif keyword == 'sphere':
                x = float(parts[1])
                y = float(parts[2])
                z = float(parts[3])
                r = float(parts[4])
                center = Vector3(x, y, z)
                sphere = Sphere(center=center, radius=r, color=current_color, texture=current_texture)
                spheres.append(sphere)
            
            elif keyword == 'sun':
                x = float(parts[1])
                y = float(parts[2])
                z = float(parts[3])
                direction = Vector3(x, y, z)
                sun = Sun(direction=direction, color=current_color)
                suns.append(sun)
            
            elif keyword == 'fisheye':
                camera_mode = 'fisheye'
            
            elif keyword == 'panorama':
                camera_mode = 'panorama'
            
            elif keyword == 'plane':
                a = float(parts[1])
                b = float(parts[2])
                c = float(parts[3])
                d = float(parts[4])
                planes.append(Plane(a, b, c, d, current_color))
            
            elif keyword == 'xyz':
                x = float(parts[1])
                y = float(parts[2])
                z = float(parts[3])
                vertices.append(Vector3(x, y, z))
            
            elif keyword == 'tri':
                i1 = int(parts[1])
                i2 = int(parts[2])
                i3 = int(parts[3])
                def resolve(idx):
                    if idx > 0:
                        return idx - 1
                    else:
                        return len(vertices) + idx
                try:
                    v0 = vertices[resolve(i1)]
                    v1 = vertices[resolve(i2)]
                    v2 = vertices[resolve(i3)]
                    triangles.append(Triangle(v0, v1, v2, current_color, texture=current_texture))
                except Exception:
                    #invalid indices; ignore
                    pass
            
            elif keyword == 'texture':
                texname = parts[1]
                if texname.lower() == 'none':
                    current_texture = None
                else:
                    try:
                        #load image with PIL and ensure RGB
                        img = Image.open(texname).convert('RGB')
                        current_texture = img
                    except Exception:
                        current_texture = None
    
    return width, height, output_filename, spheres, planes, triangles, suns, exposure, eye, forward, up, camera_mode


def applyExposure(linear, exposure):
    #exposure
    if exposure is not None:
        return 1.0 - math.exp(-exposure * linear)
    else:
        return linear

def renderImg(width, height, spheres, planes, triangles, suns, exposure=None, eye=None, forward=None, up=None, camera_mode='pinhole'):
    #render
    if eye is None:
        eye = Vector3(0, 0, 0)
    if forward is None:
        forward = Vector3(0, 0, -1)
    if up is None:
        up = Vector3(0, 1, 0)
    
    #calc right & up from forward and up
    forward_norm = forward.normalize()
    right_vec = forward_norm.cross(up)
    if right_vec.length() < 1e-10:
        #forward and up parallel
        right = Vector3(1, 0, 0)
        up_final = Vector3(0, 1, 0)
    else:
        right = right_vec.normalize()
        up_final = right.cross(forward_norm).normalize()
    
    #create image
    img = Image.new('RGBA', (width, height), (0, 0, 0, 255))
    pixels = img.load()
    
    #render each pixel
    for y in range(height):
        for x in range(width):
            ray = generateRay(x, y, width, height, eye, forward, right, up_final, camera_mode)
            if ray is None:
                #transparent where no ray is shot
                pixels[x, y] = (0, 0, 0, 0)
                continue
            #set global planes for tracing
            globals()['_planes_for_tracing'] = planes
            globals()['_triangles_for_tracing'] = triangles
            linear_color = shadeRay(ray, spheres, suns, x, y, width, height)
            
            if linear_color is None:
                #transparent background
                pixels[x, y] = (0, 0, 0, 0)
            else:
                #apply exposure
                r_exposed = applyExposure(linear_color.x, exposure)
                g_exposed = applyExposure(linear_color.y, exposure)
                b_exposed = applyExposure(linear_color.z, exposure)
                
                #clamp exposed to 0-1
                r_exposed = clamp(r_exposed, 0, 1)
                g_exposed = clamp(g_exposed, 0, 1)
                b_exposed = clamp(b_exposed, 0, 1)
                
                #convert to srgb
                r_srgb = linearToSrgb(r_exposed)
                g_srgb = linearToSrgb(g_exposed)
                b_srgb = linearToSrgb(b_exposed)
                
                #clamp to 0-1 and convert to 0-255
                r = int(clamp(r_srgb, 0, 1) * 255)
                g = int(clamp(g_srgb, 0, 1) * 255)
                b = int(clamp(b_srgb, 0, 1) * 255)
                
                pixels[x, y] = (r, g, b, 255)
    
    return img


def main():
    if len(sys.argv) != 2:
        print("Usage: python raytracer.py <input_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    #parse input file
    width, height, output_filename, spheres, planes, triangles, suns, exposure, eye, forward, up, camera_mode = parseFile(input_file)
    
    #render scene
    img = renderImg(width, height, spheres, planes, triangles, suns, exposure, eye, forward, up, camera_mode)
    
    #save image
    img.save(output_filename)
    print(f"Rendered {output_filename}")


if __name__ == '__main__':
    main()
