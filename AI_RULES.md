# AI Rules for FinDash Application

## Tech Stack Overview

• **Frontend Framework**: React 18 with TypeScript
• **Styling**: Tailwind CSS with shadcn/ui components
• **Routing**: React Router v6
• **State Management**: React Context API
• **Charts**: Recharts for data visualization
• **UI Components**: Radix UI primitives with shadcn/ui implementation
• **Build Tool**: Vite with SWC
• **Icons**: Lucide React

## Library Usage Rules

### Data Visualization
• **Use Recharts** for all charting needs (AreaChart, BarChart, PieChart, etc.)
• **Use shadcn/ui Table** for all data tables
• **Use shadcn/ui Card** for all dashboard panels

### UI Components
• **Use shadcn/ui components** for all UI elements (Button, Input, Select, etc.)
• **Use Radix UI primitives** only when shadcn/ui doesn't provide the needed component
• **Use Lucide React** for all icons

### State Management
• **Use React Context API** for global state management
• **Use React hooks** (useState, useEffect, useMemo, etc.) for local component state

### Routing
• **Use React Router v6** for all navigation and routing

### Data Handling
• **Use localStorage** for client-side data persistence
• **Use JSON** for data serialization
• **Use TypeScript interfaces** for all data structures

### Styling
• **Use Tailwind CSS** for all styling
• **Use shadcn/ui theme variables** for consistent colors
• **Follow existing class naming conventions**

## Date Filtering Implementation Rules

### Required Implementation
• Add date range selection controls to all screens/tabs displaying time-filterable data
• Implement two date range pickers:
  - Date range 1: (start_date_1 to end_date_1)
  - Date range 2: (start_date_2 to end_date_2)
• Apply date filters to all data display logic, respecting exactly the user-selected intervals
• Show difference/evolution between the two date ranges as already implemented in each screen
• Maintain current display format (do not change layout, fields, or components)
• Adjust only where there are listings, charts, tables, or date-based indicators
• Ensure all calculations, indicators, charts, and percentages reflect only data filtered by the period
• Do not remove existing filters - only add the date filter layer and integrate correctly
• Do not change design, style, components, spacing, colors, or usability outside of date filtering

### Strict Do Not Implement List
• Do not recreate layout
• Do not modify data structures beyond what's necessary to apply filters
• Do not move components
• Do not rename variables without necessity
• Do not change charts, indicators, or existing formulas (only apply the filter to them)
• Do not add extra functionalities not requested

### QA Acceptance Criteria
• All reports/tabs have date selection controls correctly positioned
• Data APIs/queries only return data within user-selected periods
• Comparison works between two completely independent intervals
• System visually remains the same except for new filter fields
• No regressions, visual bugs, or unintended changes