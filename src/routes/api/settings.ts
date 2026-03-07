/**
 * Settings API endpoints
 * GET /api/settings - List all settings (API key values masked)
 * GET /api/settings/:key - Get single setting
 * PUT /api/settings/:key - Create or update a setting
 * DELETE /api/settings/:key - Delete a setting
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../../db/index.js';

export const settingsApiRouter = Router();

/** Keys that should have their values masked in list responses */
const SENSITIVE_KEYS = new Set(['youtube_api_key']);

/** Mask a sensitive value, showing only last 4 characters */
function maskValue(value: string): string {
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
}

// GET / - List all settings
settingsApiRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value, updated_at')
      .order('key');

    if (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ success: false, errors: ['Failed to fetch settings'] });
      return;
    }

    const settings = (data || []).map((row: any) => ({
      key: row.key,
      value: SENSITIVE_KEYS.has(row.key) ? maskValue(row.value) : row.value,
      configured: true,
      updatedAt: row.updated_at,
    }));

    res.json(settings);
  } catch (error) {
    console.error('List settings error:', error);
    res.status(500).json({ success: false, errors: ['Internal server error'] });
  }
});

// GET /:key - Get single setting
settingsApiRouter.get('/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    const { data, error } = await supabase
      .from('settings')
      .select('key, value, updated_at')
      .eq('key', key)
      .single();

    if (error || !data) {
      res.status(404).json({ success: false, errors: ['Setting not found'] });
      return;
    }

    res.json({
      key: data.key,
      value: SENSITIVE_KEYS.has(data.key) ? maskValue(data.value) : data.value,
      configured: true,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ success: false, errors: ['Internal server error'] });
  }
});

// PUT /:key - Create or update a setting
settingsApiRouter.put('/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { value } = req.body as { value?: string };

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      res.status(400).json({ success: false, errors: ['value is required'] });
      return;
    }

    const trimmedValue = value.trim();

    // Upsert: insert or update on conflict
    const { error } = await supabase
      .from('settings')
      .upsert(
        { key, value: trimmedValue, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Error saving setting:', error);
      res.status(500).json({ success: false, errors: ['Failed to save setting'] });
      return;
    }

    res.json({
      success: true,
      key,
      value: SENSITIVE_KEYS.has(String(key)) ? maskValue(trimmedValue) : trimmedValue,
    });
  } catch (error) {
    console.error('Save setting error:', error);
    res.status(500).json({ success: false, errors: ['Internal server error'] });
  }
});

// DELETE /:key - Delete a setting
settingsApiRouter.delete('/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    const { error } = await supabase
      .from('settings')
      .delete()
      .eq('key', key);

    if (error) {
      console.error('Error deleting setting:', error);
      res.status(500).json({ success: false, errors: ['Failed to delete setting'] });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ success: false, errors: ['Internal server error'] });
  }
});
