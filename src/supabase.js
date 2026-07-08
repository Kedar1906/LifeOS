import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const isMock = !SUPABASE_URL || !SUPABASE_ANON_KEY

export const supabase = isMock ? null : createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Mock Auth Event emitter
let authCallback = null

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  if (isMock) {
    const user = { email, id: 'mock-user-id' }
    localStorage.setItem('lifeos_mock_user', JSON.stringify(user))
    if (authCallback) authCallback(user)
    return { user, error: null }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { user: data?.user, error }
}

export async function signOut() {
  if (isMock) {
    localStorage.removeItem('lifeos_mock_user')
    if (authCallback) authCallback(null)
    return
  }
  await supabase.auth.signOut()
}

export async function getSession() {
  if (isMock) {
    const stored = localStorage.getItem('lifeos_mock_user')
    return stored ? JSON.parse(stored) : null
  }
  const { data } = await supabase.auth.getSession()
  return data?.session?.user ?? null
}

export function onAuthChange(cb) {
  if (isMock) {
    authCallback = cb
    const stored = localStorage.getItem('lifeos_mock_user')
    cb(stored ? JSON.parse(stored) : null)
    return { unsubscribe: () => { authCallback = null } }
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null)
  })
  return subscription
}

// ─── Collection helpers ───────────────────────────────────────────────────────
export async function loadCollection(table) {
  if (isMock) {
    const key = `lifeos_table_${table}`
    const stored = localStorage.getItem(key)
    const rows = stored ? JSON.parse(stored) : []
    return rows.map(row => ({ id: row.id, ...(row.data || {}) }))
  }
  const { data, error } = await supabase.from(table).select('id, data').order('updated_at', { ascending: true })
  if (error) { console.error(`loadCollection(${table}):`, error.message); return [] }
  return (data || []).map(row => ({ id: row.id, ...(row.data || {}) }))
}

export async function upsertRow(table, id, payload) {
  if (isMock) {
    const key = `lifeos_table_${table}`
    const stored = localStorage.getItem(key)
    let rows = stored ? JSON.parse(stored) : []
    const rest = { ...payload }
    delete rest.id
    const existingIndex = rows.findIndex(row => row.id === id)
    const newRow = { id, data: rest, updated_at: new Date().toISOString() }
    if (existingIndex >= 0) {
      rows[existingIndex] = newRow
    } else {
      rows.push(newRow)
    }
    localStorage.setItem(key, JSON.stringify(rows))
    return
  }
  const rest = { ...payload }
  delete rest.id
  const { error } = await supabase.from(table)
    .upsert({ id, data: rest, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) console.error(`upsertRow(${table}):`, error.message)
}

export async function deleteRow(table, id) {
  if (isMock) {
    const key = `lifeos_table_${table}`
    const stored = localStorage.getItem(key)
    if (stored) {
      let rows = JSON.parse(stored)
      rows = rows.filter(row => row.id !== id)
      localStorage.setItem(key, JSON.stringify(rows))
    }
    return
  }
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) console.error(`deleteRow(${table}):`, error.message)
}

export async function loadSingleton(table, key = 'singleton') {
  if (isMock) {
    const storageKey = `lifeos_singleton_${table}_${key}`
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : null
  }
  const { data, error } = await supabase.from(table).select('data').eq('id', key).maybeSingle()
  if (error) { console.error(`loadSingleton(${table}):`, error.message); return null }
  return data?.data ?? null
}

export async function saveSingleton(table, value, key = 'singleton') {
  if (isMock) {
    const storageKey = `lifeos_singleton_${table}_${key}`
    localStorage.setItem(storageKey, JSON.stringify(value))
    return
  }
  const { error } = await supabase.from(table)
    .upsert({ id: key, data: value, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) console.error(`saveSingleton(${table}):`, error.message)
}
