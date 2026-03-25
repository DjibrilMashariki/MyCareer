# MyCareer Platform — UML Diagrams

## Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors
        S["🎓 Student"]
        ST["👨‍🏫 Staff"]
        A["🔑 Admin"]
    end

    subgraph Auth ["Authentication"]
        UC1["Sign Up"]
        UC2["Log In / Log Out"]
    end

    subgraph StudentUseCases ["Student Use Cases"]
        UC3["Create Draft Resume"]
        UC4["Upload Resume File"]
        UC5["Submit Resume for Review"]
        UC6["View Resume Status"]
        UC7["View Staff Feedback"]
        UC8["View Version History"]
        UC9["Download Resume Version"]
        UC10["Browse Resume Templates"]
        UC11["Download Template"]
        UC12["View Notifications"]
    end

    subgraph StaffUseCases ["Staff Use Cases"]
        UC13["View Assigned Resumes"]
        UC14["Approve Resume"]
        UC15["Request Changes"]
        UC16["Submit Feedback"]
        UC17["Add Annotation on Resume"]
        UC18["Delete Own Annotation"]
        UC19["View Resume Versions"]
        UC20["View Notifications"]
    end

    subgraph AdminUseCases ["Admin Use Cases"]
        UC21["View All Resumes"]
        UC22["Change Resume Status"]
        UC23["Reassign Staff"]
        UC24["View Staff Workload"]
        UC25["View Analytics Dashboard"]
        UC26["Upload Resume Template"]
        UC27["Delete Template"]
        UC28["View Notifications"]
    end

    S --- UC1 & UC2
    S --- UC3 & UC4 & UC5 & UC6
    S --- UC7 & UC8 & UC9
    S --- UC10 & UC11 & UC12

    ST --- UC2
    ST --- UC13 & UC14 & UC15 & UC16
    ST --- UC17 & UC18 & UC19 & UC20

    A --- UC2
    A --- UC21 & UC22 & UC23 & UC24
    A --- UC25 & UC26 & UC27 & UC28

    UC5 -.->|"«includes»"| UC4
    UC14 -.->|"«triggers»"| UC20
    UC15 -.->|"«triggers»"| UC12
    UC16 -.->|"«triggers»"| UC12
    UC23 -.->|"«triggers»"| UC20
```

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    USERS {
        UUID id PK
        TEXT email UK
        TEXT full_name
        user_role role "student | staff | admin"
        TIMESTAMPTZ created_at
    }

    RESUMES {
        UUID resume_id PK
        UUID student_id FK
        UUID assigned_staff_id FK
        resume_status status "draft | submitted | changes_required | approved"
        UUID current_version_id FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    RESUME_VERSIONS {
        UUID version_id PK
        UUID resume_id FK
        TEXT file_path
        TEXT original_filename
        BIGINT file_size_bytes
        INT version_number
        TIMESTAMPTZ submitted_at
    }

    FEEDBACK {
        UUID feedback_id PK
        UUID resume_id FK
        UUID version_id FK
        UUID staff_id FK
        TEXT content
        TIMESTAMPTZ created_at
    }

    ANNOTATIONS {
        UUID id PK
        UUID resume_id FK
        UUID version_id FK
        UUID staff_id FK
        INT page_number
        FLOAT x_position
        FLOAT y_position
        TEXT content
        TIMESTAMPTZ created_at
    }

    NOTIFICATIONS {
        UUID id PK
        UUID user_id FK
        TEXT type "status_change | new_assignment | new_feedback | submission"
        TEXT title
        TEXT message
        UUID resume_id FK
        BOOLEAN is_read
        TIMESTAMPTZ created_at
    }

    RESUME_TEMPLATES {
        UUID id PK
        TEXT name
        TEXT description
        TEXT file_path
        TEXT original_filename
        BIGINT file_size_bytes
        UUID uploaded_by FK
        TIMESTAMPTZ created_at
    }

    STORAGE_OBJECTS {
        TEXT name PK
        TEXT bucket_id
        TIMESTAMPTZ created_at
    }

    AUTH_USERS {
        UUID id PK
        TEXT email
    }

    AUTH_USERS ||--|| USERS : "extends"
    USERS ||--o{ RESUMES : "owns (student)"
    USERS ||--o{ RESUMES : "reviews (staff)"
    USERS ||--o{ FEEDBACK : "writes"
    USERS ||--o{ ANNOTATIONS : "creates"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ RESUME_TEMPLATES : "uploads (admin)"

    RESUMES ||--o{ RESUME_VERSIONS : "has versions"
    RESUMES ||--o| RESUME_VERSIONS : "current version"
    RESUMES ||--o{ FEEDBACK : "receives"
    RESUMES ||--o{ ANNOTATIONS : "has"
    RESUMES ||--o{ NOTIFICATIONS : "related to"

    RESUME_VERSIONS ||--o{ FEEDBACK : "targets"
    RESUME_VERSIONS ||--o{ ANNOTATIONS : "targets"
    RESUME_VERSIONS ||--|| STORAGE_OBJECTS : "stored as"
```

---

## Key Relationships Summary

| Relationship | Cardinality | Description |
|---|---|---|
| User → Resumes (student) | 1 : many | A student owns multiple resumes |
| User → Resumes (staff) | 1 : many | A staff member is assigned multiple resumes |
| Resume → Versions | 1 : many | Each resume has multiple file versions |
| Resume → current_version | 1 : 0..1 | Points to the latest uploaded version |
| Resume → Feedback | 1 : many | Staff leave multiple feedback items |
| Resume → Annotations | 1 : many | Staff place multiple annotations |
| User → Notifications | 1 : many | Each user receives multiple notifications |
| User → Templates (admin) | 1 : many | Admin uploads multiple templates |
| Version → Storage | 1 : 1 | Each version maps to a file in storage |
