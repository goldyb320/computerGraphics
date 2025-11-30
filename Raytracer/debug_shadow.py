#!/usr/bin/env python3
#debug script to check shadow ray behavior
import sys
sys.path.insert(0, '.')

from raytracer import *

#create a simple test scene
spheres = [
    Sphere(Vector3(0, 0, -1), 0.3, Vector3(1, 1, 1)),
    Sphere(Vector3(0.5, 0, -1), 0.2, Vector3(1, 0, 0)),
]

#test ray hitting first sphere
ray = Ray(Vector3(0, 0, 0), Vector3(0, 0, -1))
intersection = find_closest_intersection(ray, spheres)
print(f"Primary intersection: {intersection.sphere is spheres[0]}")

#test shadow ray from first sphere
if intersection:
    sun = Sun(Vector3(0, 0, -1), Vector3(1, 1, 1))
    light_dir = sun.direction.normalize()
    shadow_ray = Ray(
        origin=intersection.point + intersection.normal * 0.0001,
        direction=light_dir
    )
    
    #should exclude first sphere
    shadow_intersection = find_closest_intersection(
        shadow_ray, spheres, 
        exclude_sphere=intersection.sphere,
        min_t_threshold=0.0002
    )
    
    print(f"Shadow ray origin: {shadow_ray.origin.x}, {shadow_ray.origin.y}, {shadow_ray.origin.z}")
    print(f"Shadow ray direction: {shadow_ray.direction.x}, {shadow_ray.direction.y}, {shadow_ray.direction.z}")
    print(f"Shadow intersection found: {shadow_intersection is not None}")
    if shadow_intersection:
        print(f"Shadow intersection sphere: {shadow_intersection.sphere is spheres[0]}, {shadow_intersection.sphere is spheres[1]}")
        print(f"Shadow intersection t: {shadow_intersection.t}")

