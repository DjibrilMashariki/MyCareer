# MyCareer Platform — UML Diagrams

## Use Case Diagram

```mermaid
flowchart LR
    Student["🎓 Student"]
    Staff["👨‍🏫 Staff"]
    Admin["🔑 Admin"]
    Admin -. "generalizes" .-> Staff

    subgraph System ["MyCareer Resume Review System"]
        UC_Login(("Log In / Log Out"))

        UC_Submit(("Submit Resume"))
        UC_Track(("Track Resume Status"))
        UC_ViewFeedback(("View Feedback"))
        UC_DownloadTemplates(("Download Templates"))

        UC_Review(("Review Assigned Resume"))
        UC_ProvideFeedback(("Provide Feedback"))
        UC_UpdateStatus(("Update Resume Status"))

        UC_Reassign(("Reassign Reviewer"))
        UC_ManageTemplates(("Manage Templates"))
        UC_ViewAnalytics(("View Workload / Analytics"))
    end

    Student --- UC_Login
    Student --- UC_Submit
    Student --- UC_Track
    Student --- UC_ViewFeedback
    Student --- UC_DownloadTemplates

    Staff --- UC_Login
    Staff --- UC_Review
    Staff --- UC_ProvideFeedback
    Staff --- UC_UpdateStatus

    Admin --- UC_Login
    Admin --- UC_Reassign
    Admin --- UC_ManageTemplates
    Admin --- UC_ViewAnalytics

    UC_Review -. "«include»" .-> UC_ProvideFeedback
    UC_Review -. "«include»" .-> UC_UpdateStatus
```

---

## Sequence Diagrams

### 1) Resume Submission

```mermaid
sequenceDiagram
    actor Student
    participant API as Resume API
    participant Assign as Assignment Logic
    participant DB as Database
    participant Notify as Notification Service

    Student->>API: submitResume(resume_id)
    API->>API: Check role = student

    alt Invalid role
        API-->>Student: 403 Forbidden
    else Valid role
        API->>DB: Update resume status -> submitted
        API->>Assign: assignStaff(resume_id)

        alt No available staff
            Assign-->>API: assignment_failed
            API-->>Student: 409 No staff available
        else Staff assigned
            Assign->>DB: Update assigned_staff_id
            API->>Notify: Notify staff (new_assignment)
            Notify->>DB: Insert notification
            API-->>Student: 200 Submitted
        end
    end
```

### 2) Resume Review

```mermaid
sequenceDiagram
    actor Staff
    participant API as Resume API
    participant DB as Database
    participant Notify as Notification Service

    Staff->>API: reviewResume(resume_id, version_id, status, feedback)
    API->>API: Check role + assignment

    alt Invalid role or unassigned staff
        API-->>Staff: 403 Forbidden
    else Authorized
        API->>DB: Read current resume state

        alt Invalid state transition
            API-->>Staff: 409 Invalid transition
        else Valid transition
            API->>DB: Insert feedback(version_id, staff_id, content)
            API->>DB: Update resume status
            API->>Notify: Notify student (status_change/new_feedback)
            Notify->>DB: Insert notification
            API-->>Staff: 200 Review recorded
        end
    end
```

### 3) Admin Reassignment

```mermaid
sequenceDiagram
    actor Admin
    participant API as Resume API
    participant DB as Database
    participant Notify as Notification Service

    Admin->>API: reassignReviewer(resume_id, new_staff_id)
    API->>API: Check role = admin

    alt Invalid role
        API-->>Admin: 403 Forbidden
    else Authorized
        API->>DB: Read resume + current assignment

        alt Resume missing or assignment unavailable
            API-->>Admin: 404/409 Error
        else Reassignment allowed
            API->>DB: Update assigned_staff_id
            API->>Notify: Notify new staff (new_assignment)
            Notify->>DB: Insert notification
            API-->>Admin: 200 Reassigned
        end
    end
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
        TEXT file_reference
        INT version_number
        TIMESTAMPTZ submitted_at
    }

    FEEDBACK {
        UUID feedback_id PK
        UUID version_id FK
        UUID staff_id FK
        TEXT content
        TIMESTAMPTZ created_at
    }

    ANNOTATIONS {
        UUID annotation_id PK
        UUID version_id FK
        UUID staff_id FK
        INT page_number
        FLOAT x_position
        FLOAT y_position
        TEXT content
        TIMESTAMPTZ created_at
    }

    NOTIFICATIONS {
        UUID notification_id PK
        UUID user_id FK
        TEXT type "status_change | new_assignment | new_feedback | submission"
        TEXT title
        TEXT message
        UUID resume_id FK
        BOOLEAN is_read
        TIMESTAMPTZ created_at
    }

    RESUME_TEMPLATES {
        UUID template_id PK
        TEXT name
        TEXT description
        TEXT file_reference
        UUID uploaded_by FK
        TIMESTAMPTZ created_at
    }

    USERS ||--o{ RESUMES : "owns (student_id)"
    USERS ||--o{ RESUMES : "reviews (assigned_staff_id, optional)"
    USERS ||--o{ FEEDBACK : "writes"
    USERS ||--o{ ANNOTATIONS : "creates"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ RESUME_TEMPLATES : "uploads (admin)"

    RESUMES ||--o{ RESUME_VERSIONS : "has versions"
    RESUMES o|--|| RESUME_VERSIONS : "current_version_id -> version_id"
    RESUMES ||--o{ NOTIFICATIONS : "related to (optional)"

    RESUME_VERSIONS ||--o{ FEEDBACK : "targets"
    RESUME_VERSIONS ||--o{ ANNOTATIONS : "targets"
```

---

## Diagram Legend

- `||` = exactly one
- `o|` = zero or one
- `o{` = zero or many
- `|{` = one or many
- Enum fields are shown inline in quotes (for example `status`, `role`, and `notification type`)
- Constraint note: `RESUMES.current_version_id`, when present, must reference a `RESUME_VERSIONS.version_id` row for the same `resume_id`

---

## Key Relationships Summary

| Relationship | Cardinality | Description |
|---|---|---|
| User → Resumes (student) | 1 : many | A student owns multiple resumes |
| User → Resumes (staff assignment) | 1 : many, optional per resume | A staff member can be assigned many resumes; a resume may be temporarily unassigned |
| Resume → Versions | 1 : many | Each resume has multiple file versions |
| Resume → current_version | 0..1 : 1 | `current_version_id` points to exactly one version when set |
| Version → Feedback | 1 : many | Staff leave multiple feedback items per version |
| Version → Annotations | 1 : many | Staff place multiple annotations per version |
| User → Notifications | 1 : many | Each user receives multiple notifications |
| User → Templates (admin) | 1 : many | Admin uploads multiple templates |
| Resume → Notifications | 1 : many (optional context) | Notifications may optionally reference a resume |
