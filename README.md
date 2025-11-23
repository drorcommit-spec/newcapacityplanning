# Product Capacity Planning Platform

A responsive web-based platform for planning, allocating, and monitoring Product Manager capacity across multiple customers and projects at sprint-level granularity.

## Features

- **Team Management**: Add, edit, and manage team members with roles (VP Product, Product Director, Product Manager, Product Operations Manager)
- **Project & Customer Management**: Manage customer projects with status tracking, capacity limits, and PMO contacts
- **Sprint Allocation Planning**: Allocate PMs to projects by year, month, and sprint (2-week sprints)
- **Capacity Monitoring**: Real-time utilization tracking with color-coded alerts (under/full/over allocated)
- **Allocation History**: Complete audit trail of all allocation changes
- **Role-Based Access**: Login system with different user roles
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- React 18 + TypeScript
- Vite
- React Router
- Tailwind CSS
- LocalStorage for data persistence

## Getting Started

### Installation

```bash
cd product-capacity-platform
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5174 in your browser (or the next available port if 5174 is in use).

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Usage

1. **Login**: Enter your name and select your role
2. **Team Management**: Add team members and assign Product Managers to Product Directors
3. **Projects**: Create customer projects with type, status, and capacity limits
4. **Allocations**: Allocate PMs to projects by sprint with percentage-based capacity
5. **Dashboard**: Monitor current sprint capacity and alerts
6. **History**: View complete audit trail of all changes

## Sprint Structure

- 1 Sprint = 2 weeks = 10 working days
- 1 Month = 2 Sprints
- 1 Year = 24 Sprints

## Data Storage

All data is stored in browser LocalStorage. To reset data, clear browser storage or use browser DevTools.

## Future Enhancements

- Backend API integration
- Database persistence
- User authentication service
- Export/Import functionality
- Advanced reporting and analytics
- Email notifications for alerts
