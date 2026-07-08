import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { user: data?.user, error }
}
export async function signOut() {
  await supabase.auth.signOut()
}
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data?.session?.user ?? null
}
export function onAuthChange(cb) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null)
  })
  return subscription
}

// ─── Collection helpers ───────────────────────────────────────────────────────
export async function loadCollection(table) {
  const { data, error } = await supabase.from(table).select('id, data').order('updated_at', { ascending: true })
  if (error) { console.error(`loadCollection(${table}):`, error.message); return [] }
  return (data || []).map(row => ({ id: row.id, ...(row.data || {}) }))
}
export async function upsertRow(table, id, payload) {
  const { id: _id, ...rest } = payload
  const { error } = await supabase.from(table)
    .upsert({ id, data: rest, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) console.error(`upsertRow(${table}):`, error.message)
}
export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) console.error(`deleteRow(${table}):`, error.message)
}
export async function loadSingleton(table, key = 'singleton') {
  const { data, error } = await supabase.from(table).select('data').eq('id', key).maybeSingle()
  if (error) { console.error(`loadSingleton(${table}):`, error.message); return null }
  return data?.data ?? null
}
export async function saveSingleton(table, value, key = 'singleton') {
  const { error } = await supabase.from(table)
    .upsert({ id: key, data: value, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) console.error(`saveSingleton(${table}):`, error.message)
}
