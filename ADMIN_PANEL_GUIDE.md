# Admin Panel Guide

## Overview

The admin panel provides a comprehensive interface for managing all learning content, modules, sections, questions, and users in the application.

## Accessing the Admin Panel

1. **First, make a user an admin:**
   ```bash
   cd backend
   node scripts/add-admin-column.js
   ```
   This will add the `is_admin` column to the users table and make the first user an admin.

2. **Or manually set a user as admin:**
   - Use the User Management interface in the admin panel
   - Or directly update the database:
     ```sql
     UPDATE users SET is_admin = 1 WHERE email = 'your-email@example.com';
     ```

3. **Access the panel:**
   - Log in with an admin account
   - Click "Admin Panel" in the sidebar (only visible to admins)
   - Or navigate to `/admin` directly

## Features

### Dashboard
- Overview statistics (users, modules, sections, questions, content)
- Quick actions to create new content
- Module management interface

### Module Management
- **Create Modules**: Add new learning modules with name, display name, description, and order
- **Edit Modules**: Modify existing module details
- **Delete Modules**: Remove modules (only if they have no sections)
- **View Sections**: See all sections within a module

### Section Management
- **Create Sections**: Add sections to modules
- **Edit Sections**: Modify section details
- **Delete Sections**: Remove sections (only if they have no questions or content)
- **Manage Questions**: View and manage questions in each section
- **Manage Content**: View and manage learning content in each section

### Question Management
- **Create Questions**: Add multiple-choice questions with:
  - Question text
  - Multiple options (minimum 2)
  - Correct answer (must be one of the options)
  - Explanation
  - Question type
- **Edit Questions**: Modify existing questions
- **Delete Questions**: Remove questions

### Learning Content Management
- **Create Content**: Add learning content screens with:
  - Screen title
  - Read time (in minutes)
  - Markdown content
  - Order index
- **Edit Content**: Modify existing content
- **Delete Content**: Remove content items

### User Management
- **View All Users**: See list of all registered users
- **Promote to Admin**: Grant admin privileges to users
- **Remove Admin**: Revoke admin privileges (cannot remove your own admin status)

## API Endpoints

All admin endpoints are prefixed with `/api/admin` and require:
- Authentication (logged in user)
- Admin role (`is_admin = 1`)

### Modules
- `GET /api/admin/modules` - List all modules
- `GET /api/admin/modules/:id` - Get single module
- `POST /api/admin/modules` - Create module
- `PUT /api/admin/modules/:id` - Update module
- `DELETE /api/admin/modules/:id` - Delete module

### Sections
- `GET /api/admin/modules/:moduleId/sections` - List sections in module
- `GET /api/admin/sections/:id` - Get single section
- `POST /api/admin/sections` - Create section
- `PUT /api/admin/sections/:id` - Update section
- `DELETE /api/admin/sections/:id` - Delete section

### Questions
- `GET /api/admin/sections/:sectionId/questions` - List questions in section
- `GET /api/admin/questions/:id` - Get single question
- `POST /api/admin/questions` - Create question
- `PUT /api/admin/questions/:id` - Update question
- `DELETE /api/admin/questions/:id` - Delete question

### Learning Content
- `GET /api/admin/sections/:sectionId/learning-content` - List content in section
- `GET /api/admin/learning-content/:id` - Get single content
- `POST /api/admin/learning-content` - Create content
- `PUT /api/admin/learning-content/:id` - Update content
- `DELETE /api/admin/learning-content/:id` - Delete content

### Users
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user (promote/remove admin)

### Statistics
- `GET /api/admin/stats` - Get system statistics

## Security

- All admin routes are protected by authentication middleware
- Admin routes require `is_admin = 1` in the user record
- Users cannot remove their own admin status
- All operations are logged server-side

## Best Practices

1. **Backup Before Deletion**: Always backup your database before deleting modules, sections, or questions
2. **Test Content**: Test questions and content before publishing
3. **Order Management**: Use order_index to control the sequence of modules, sections, and content
4. **Unique Names**: Module and section names must be unique within their scope
5. **Content Validation**: Ensure markdown content is properly formatted
6. **Question Quality**: 
   - Provide clear, unambiguous questions
   - Include detailed explanations
   - Ensure correct answer matches one of the options

## Troubleshooting

### "Admin access required" error
- Ensure your user account has `is_admin = 1` in the database
- Log out and log back in after being promoted to admin

### Cannot delete module/section
- Modules can only be deleted if they have no sections
- Sections can only be deleted if they have no questions or content
- Delete child items first, then the parent

### Content not appearing
- Check that the section_id is correct
- Verify order_index is set correctly
- Ensure content has valid markdown

## Database Schema

The admin panel manages these tables:
- `modules` - Learning modules
- `sections` - Sections within modules
- `questions` - Quiz questions
- `learning_content` - Educational content screens
- `users` - User accounts (with `is_admin` field)

