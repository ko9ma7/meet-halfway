import { isSupabaseConfigured } from '../config.js';
import { LocalMeetingRepository } from './localRepository.js';
import { SupabaseMeetingRepository } from './supabaseRepository.js';
export const repository = isSupabaseConfigured
    ? new SupabaseMeetingRepository()
    : new LocalMeetingRepository();
