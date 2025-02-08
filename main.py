import json
from collections import defaultdict

with open("classes(1).json", "r", encoding="utf-8") as file:
    data = json.load(file)

lectures = [entry for entry in data if entry.get("activity_type") == "Lecture" and str(entry.get("school")) not in ["999", "HONS"]]

# Group courses by their unique identifiers
course_groups = defaultdict(lambda: {
    "prefixes": set(),
    "sections": set(),
    "schools": set(),
    "enrolled_current": 0,
    "enrolled_max": 0,
    "class_numbers": set(),
    "assistants": set()
})

for entry in lectures:
    key = (entry["course_number"].strip(), ''.join(sorted(entry["instructors"])))
    
    # Update sets and numeric values
    course_groups[key]["prefixes"].add(entry["course_prefix"].strip())
    course_groups[key]["sections"].add(str(entry["section"]).strip())
    course_groups[key]["schools"].add(entry["school"].strip())
    course_groups[key]["class_numbers"].add(int(entry["class_number"]))
    course_groups[key]["assistants"].update(entry["assistants"].split(", "))
    
    course_groups[key]["enrolled_current"] += int(entry["enrolled_current"])
    course_groups[key]["enrolled_max"] += int(entry["enrolled_max"])
    
    # Store non-set values
    course_groups[key]["title"] = entry["title"].strip()
    course_groups[key]["instructors"] = entry["instructors"].split(", ")
    course_groups[key]["course_number"] = entry["course_number"]


# Create unique courses list with merged sections
unique_courses = []
for key, details in course_groups.items():
    course_data = {
        "course_number": details["course_number"],  
        "course_prefixes": list(sorted(details["prefixes"])),  
        "sections": list(sorted(details["sections"])),  
        "title": details["title"],  
        "instructors": details["instructors"],  
        "class_numbers": list(sorted(details["class_numbers"])), 
        "enrolled_current": details["enrolled_current"],  
        "enrolled_max": details["enrolled_max"],  
        "assistants": list(details["assistants"]),  
        "schools": list(sorted(details["schools"])), 
    }
    unique_courses.append(course_data)

unique_courses.sort(key=lambda x: (x["course_prefixes"], x["course_number"]))

with open("unique_courses.json", "w", encoding="utf-8") as file:
    json.dump(unique_courses, file, indent=4, ensure_ascii=False)

print(f"Processed {len(unique_courses)} unique courses. Results saved to 'unique_courses.json'")
# Processed 1766 unique courses. Results saved to 'unique_courses.json'