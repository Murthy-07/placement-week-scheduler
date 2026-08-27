# Placement Week Scheduler

A configurable Placement Week Scheduling System designed to coordinate student interviews across companies, recruiter panels, rooms, and time slots while respecting scheduling constraints and handling real-world disruptions.

The system was initially developed for **Assignment A — The Placement Week Scheduler** and has been generalized to support configurable placement environments, real student data, CSV imports, manual data management, and dynamic scheduling parameters.

## Problem Statement

Managing a college placement week manually becomes difficult when the number of students, companies, recruiter panels, rooms, and available days increases.

The scheduler needs to assign interviews while ensuring that:

- A student is not scheduled for overlapping interviews.
- A room is not assigned to multiple interviews at the same time.
- A recruiter panel is not assigned to multiple interviews at the same time.
- Students meet company CGPA eligibility requirements.
- Multiple student-company shortlists are handled efficiently.
- Limited rooms and time slots are used effectively.
- Unscheduled candidates are explicitly reported.
- Disruptions such as panel delays, panel dropouts, student withdrawals, and room outages can be handled.
- Changes caused by disruptions should be minimized where possible.

This project provides an automated scheduling and replanning system for these requirements.

## Key Features

### 1. Configurable Placement Environment

The application is not restricted to the original 800-student configuration.

Configuration can be adjusted for:

- Number of students
- Number of companies
- Number of rooms
- Number of recruiter panels
- Number of placement days
- Daily operating hours
- Interview duration
- Break duration
- Deterministic random seed

For example, the system can be configured for a larger college with thousands of students and an extended placement schedule.

### 2. Student Management

Students can be managed directly through the application.

The system supports adding students with:

- Student ID
- Name
- CGPA
- Branch
- Institutional email

Student IDs are validated for uniqueness and CGPA values are validated between 0.00 and 10.00.

New students become part of the active scheduling dataset.

### 3. Real Data / CSV Import

The application supports importing real placement data using CSV files.

The CSV import workflow supports:

- Student data
- Company data
- Shortlist data
- Room data
- Panel data

The importer performs validation before accepting the data and checks relationships between the different datasets.

The application provides a workflow for switching between:

- Generated Demo Data
- Imported Real Data

### 4. Automated Interview Scheduling

The scheduling engine assigns interviews while considering:

- Student availability
- Company eligibility
- Room availability
- Recruiter panel availability
- Available time slots
- Placement-day constraints
- Interview duration
- Break periods

The scheduler tracks candidates that could not be scheduled and records the reason instead of silently creating invalid assignments.

### 5. Constraint Validation

The system continuously validates important scheduling invariants.

It checks for:

- Student clashes
- Room conflicts
- Panel conflicts
- CGPA eligibility violations
- Invalid assignments

The validation engine provides an explicit view of scheduling conflicts and validation results.

### 6. Dynamic Replanning

The application can respond to placement-week disruptions.

Supported scenarios include:

#### Panel Delay

A recruiter panel becomes unavailable for a period of time.

#### Panel Dropout

A recruiter panel becomes unavailable and affected interviews need to be reconsidered.

#### Student Withdrawal

Students withdraw from the placement process and their assignments are released.

#### Room Outage

A room becomes unavailable and affected interviews are considered for relocation.

#### Combined Day-1 Crisis

Multiple disruptions occur together and the system performs a combined replanning operation.

The replanning engine attempts to preserve unaffected assignments and minimize unnecessary schedule changes.

### 7. Before / After Change Tracking

When a disruption causes schedule changes, the system provides a before/after comparison.

Changes can include information such as:

- Student
- Company
- Panel
- Previous time
- New time
- Previous room
- New room
- Change status
- Reason for change

This allows a coordinator to understand why the schedule changed.

### 8. Scheduling Metrics & Telemetry

The application provides scheduling metrics including:

- Total shortlists
- Scheduled interviews
- Unscheduled shortlists
- Room-slot utilization
- Shortlist fulfillment rate
- Student clashes
- Room conflicts
- Panel conflicts
- Average candidate waiting time
- Maximum waiting time
- Replanning churn
- Disruption information

The metrics engine also handles edge cases such as empty schedules and zero-capacity configurations without producing invalid numerical values.

## Example Default Configuration

The original Assignment A configuration uses:

| Parameter | Default |
|---|---:|
| Students | 800 |
| Companies | 35 |
| Rooms | 20 |
| Placement Days | 5 |
| Operating Time | 09:00 – 17:00 |
| Interview Duration | 30 minutes |
| Seed | 42 |

The configuration system allows these parameters to be changed for different placement environments.

## Technology Stack

### Frontend

- React 19
- TypeScript 5.8
- Tailwind CSS
- Lucide React
- Vite 6.2

### Application Runtime

- Node.js
- TypeScript
- TSX
- Express is available in the project runtime

### Architecture

The application follows a separation between presentation, state management, and scheduling engines.

UI Components
      │
      ▼
SchedulerContext
      │
      ├── Configuration
      ├── Dataset
      ├── Schedule State
      └── Application Actions
      │
      ▼
Engine Layer
      │
      ├── Data Generator
      ├── Scheduler
      ├── Replanning Engine
      ├── Validator
      ├── Metrics Engine
      └── CSV Importer
