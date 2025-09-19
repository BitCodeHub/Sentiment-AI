const express = require('express');
const { pool } = require('../db/connection');
const { verifyToken } = require('./auth');

const router = express.Router();

// Create assignment
router.post('/', verifyToken, async (req, res) => {
  try {
    const { reviewId, assignedToEmail, notes } = req.body;
    const assignedBy = req.user.id;
    
    // Find user by email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [assignedToEmail]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        details: `No user found with email: ${assignedToEmail}`
      });
    }
    
    const assignedTo = userResult.rows[0].id;
    
    // Create assignment
    const result = await pool.query(
      `INSERT INTO assignments (review_id, assigned_to, assigned_by, notes, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [reviewId, assignedTo, assignedBy, notes, 'pending']
    );
    
    console.log('[Assignments] Created assignment:', result.rows[0].id);
    
    res.json({
      success: true,
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('[Assignments] Create error:', error);
    res.status(500).json({
      error: 'Failed to create assignment',
      details: error.message
    });
  }
});

// Get assignments
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, assignedTo, assignedBy } = req.query;
    let query = `
      SELECT 
        a.*,
        u1.name as assigned_to_name,
        u1.email as assigned_to_email,
        u2.name as assigned_by_name,
        u2.email as assigned_by_email
      FROM assignments a
      JOIN users u1 ON a.assigned_to = u1.id
      JOIN users u2 ON a.assigned_by = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      query += ` AND a.status = $${++paramCount}`;
      params.push(status);
    }
    
    if (assignedTo) {
      query += ` AND a.assigned_to = $${++paramCount}`;
      params.push(assignedTo);
    }
    
    if (assignedBy) {
      query += ` AND a.assigned_by = $${++paramCount}`;
      params.push(assignedBy);
    }
    
    query += ' ORDER BY a.created_at DESC';
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      assignments: result.rows
    });
  } catch (error) {
    console.error('[Assignments] Get error:', error);
    res.status(500).json({
      error: 'Failed to get assignments',
      details: error.message
    });
  }
});

// Update assignment status
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    let updateFields = [];
    let params = [];
    let paramCount = 0;
    
    if (status) {
      updateFields.push(`status = $${++paramCount}`);
      params.push(status);
    }
    
    if (notes !== undefined) {
      updateFields.push(`notes = $${++paramCount}`);
      params.push(notes);
    }
    
    params.push(id);
    
    const result = await pool.query(
      `UPDATE assignments 
       SET ${updateFields.join(', ')}
       WHERE id = $${++paramCount}
       RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Assignment not found'
      });
    }
    
    console.log('[Assignments] Updated assignment:', id);
    
    res.json({
      success: true,
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('[Assignments] Update error:', error);
    res.status(500).json({
      error: 'Failed to update assignment',
      details: error.message
    });
  }
});

// Delete assignment
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM assignments WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Assignment not found'
      });
    }
    
    console.log('[Assignments] Deleted assignment:', id);
    
    res.json({
      success: true,
      deletedId: id
    });
  } catch (error) {
    console.error('[Assignments] Delete error:', error);
    res.status(500).json({
      error: 'Failed to delete assignment',
      details: error.message
    });
  }
});

module.exports = router;