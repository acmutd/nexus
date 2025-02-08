import json
from collections import defaultdict

# Load JSON file
with open("classes(1).json", "r", encoding="utf-8") as file:
    data = json.load(file)

# Filter only lectures and exclude 999 and HONS
lectures = [entry for entry in data if entry.get("activity_type") == "Lecture" and str(entry.get("school")) not in ["999", "HONS"]]

# Group courses by their unique identifiers
course_groups = defaultdict(lambda: {
    "prefixes": set(),
    "sections": set(),
    "schools": set(),
    "enrolled_current": 0,
    "enrolled_max": 0,
    "class_numbers": set(),
    "textbooks": set(),
    "assistants": set()
})

for entry in lectures:
    key = (entry["course_number"], ', '.join(sorted(entry["instructors"])))
    
    # Update sets with all values
    course_groups[key]["prefixes"].add(entry["course_prefix"])
    course_groups[key]["sections"].add(entry["section"].strip())
    course_groups[key]["schools"].add(str(entry["school"]))
    course_groups[key]["class_numbers"].add(entry["class_number"])
    course_groups[key]["textbooks"].add(entry["textbooks"].strip())
    course_groups[key]["assistants"].add(entry["assistants"])
    
    # Update numeric values
    course_groups[key]["enrolled_current"] += int(entry["enrolled_current"])
    course_groups[key]["enrolled_max"] += int(entry["enrolled_max"])
    
    # Store non-set values
    course_groups[key]["title"] = entry["title"].strip()
    course_groups[key]["instructors"] = entry["instructors"]
    course_groups[key]["course_number"] = entry["course_number"]

def safe_int_conversion(value):
    # Handle sections with letters (ex. bis2190.0w1.25s) by treating them as strings
    # This will sort numeric sections first, then alphanumeric sections
    if value.isdigit():
        return (0, int(value))  # Numeric sections come first
    return (1, value)  # Non-numeric sections come second

# Create unique courses list with merged sections
unique_courses = []
for key, details in course_groups.items():
    course_data = {
        "course_number": details["course_number"],  
        "course_prefix(es)": list(sorted(details["prefixes"])),  
        "section(s)": list(sorted(details["sections"], key=safe_int_conversion)),  
        "title": details["title"],  
        "instructor(s)": details["instructors"],  
        "class_number(s)": list(sorted(details["class_numbers"])), 
        "enrolled_current": details["enrolled_current"],  
        "enrolled_max": details["enrolled_max"],  
        "assistant(s)": list(details["assistants"]),  
        "school(s)": list(sorted(details["schools"])), 
        "textbook(s)": list(details["textbooks"])  
    }
    unique_courses.append(course_data)

# Sort courses by prefix and number
unique_courses.sort(key=lambda x: (x["course_prefix"], x["course_number"]))

# Save to output JSON file
with open("unique_courses.json", "w", encoding="utf-8") as file:
    json.dump(unique_courses, file, indent=4, ensure_ascii=False)

print(f"Processed {len(unique_courses)} unique courses. Results saved to 'unique_courses.json'")