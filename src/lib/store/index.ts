import { supabase } from '../supabase'
import { localStore } from './local'
import { createSupabaseStore } from './supabase'
import type { DataStore } from './types'

export const store: DataStore = supabase ? createSupabaseStore(supabase) : localStore
export type { DataStore, NewLog, NewSong, NewTopic } from './types'
