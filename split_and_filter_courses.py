import json
import os
from collections import defaultdict

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLASSES_PATH = os.path.join(BASE_DIR, '1all_classes', 'classes_26s.json')
PREFIX_MAP_PATH = os.path.join(BASE_DIR, 'prefix_map.json')
ALT_SCHOOLS_DIR = os.path.join(BASE_DIR, '2alternate_schools')

# Load prefix map
with open(PREFIX_MAP_PATH, 'r') as f:
    prefix_map = json.load(f)

# Load all classes
with open(CLASSES_PATH, 'r') as f:
    all_classes = json.load(f)

# Group by school
schools = defaultdict(list)
for cls in all_classes:
    prefix_raw = cls.get('course_prefix')
    if not prefix_raw:
        continue  # skip if course_prefix is None or empty
    prefix = str(prefix_raw).lower()
    school = prefix_map.get(prefix)
    if not school:
        continue
    # Build course object
    course = {
        'course_number': cls.get('course_number', '').strip(),
        'course_prefixes': [prefix],
        'sections': [cls.get('section', '').strip()],
        'title': cls.get('title', '').strip(),
        'instructors': [i.strip() for i in cls.get('instructors', '').split(',') if i.strip()],
        'class_numbers': [int(cls.get('class_number', 0))],
        'enrolled_current': int(cls.get('enrolled_current', 0)),
        'enrolled_max': int(cls.get('enrolled_max', 0)),
        'assistants': [a.strip() for a in cls.get('assistants', '').split(',') if a.strip()],
        'dept': cls.get('dept', '').strip()
    }
    schools[school].append(course)

# Write each school file
for school, courses in schools.items():
    out_path = os.path.join(ALT_SCHOOLS_DIR, f'{school}_courses.json')
    with open(out_path, 'w') as f:
        json.dump(courses, f, indent=4)

# Filter top 250 by enrolled_current for each school
for school, courses in schools.items():
    sorted_courses = sorted(courses, key=lambda x: x['enrolled_current'], reverse=True)[:250]
    out_path = os.path.join(BASE_DIR, '3top_250_schools_FINAL', f'{school}_courses.json')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w') as f:
        json.dump(sorted_courses, f, indent=4)

print('Done!')
