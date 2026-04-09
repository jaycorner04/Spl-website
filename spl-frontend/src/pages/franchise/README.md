# Franchise Dashboard Structure

This folder now mirrors the franchise sidebar menu so it is easier to edit in VS Code.

## Sidebar Config

- `config/franchiseSections.js`
  Controls the franchise sidebar groups and the section title/description text.

## Section View Files

- `views/overview/DashboardSection.jsx`
  Main dashboard overview.

- `views/registration/TeamRegistrationSection.jsx`
  Team registration area.

- `views/registration/PlayerRegistrationSection.jsx`
  Player registration area.

- `views/squad/PlayerInformationSection.jsx`
  Player information section.

- `views/squad/TeamsSection.jsx`
  Teams list and snapshot section.

- `views/analytics/TeamPerformanceSection.jsx`
  Team performance analytics section.

- `views/analytics/MatchReportsSection.jsx`
  Match reports and notices section.

## Form Files

- `forms/FranchiseIdentityFields.jsx`
  The edit franchise form UI from the popup, including logo, franchise name, owner, website, and address.

- `forms/franchiseFormActions.js`
  Save, validation, payload-building, and franchise logo upload logic used by the edit franchise popup.

## Main Page

- `dashboard/FranchiseDashboard.jsx`
  Loads data and decides which section view to render based on `?section=...`.

## Reusable Building Blocks

- `sections/`
  Shared UI blocks used by the section view files.

- `cards/`
  Summary card helpers for the franchise dashboard.
