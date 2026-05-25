import { getUsersWithRolesAction } from './actions'
import dynamic from 'next/dynamic'
import { UsersList } from './users-list'
import type { ProfileWithSector, SectorRow } from '@/types/views'

const InviteUserDialog = dynamic(() => import('./invite-user-dialog').then(m => ({ default: m.InviteUserDialog })))

export default async function UsersPage() {
 let users: ProfileWithSector[] = []
 let sectors: SectorRow[] = []
 let errorMsg = ''

 try {
 const data = await getUsersWithRolesAction()
 users = data.users
 sectors = data.sectors
 } catch (e) { errorMsg = e instanceof Error ? e.message : String(e) }

 return (
 <div>
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-3xl font-heading font-bold tracking-tight">Usuarios</h2>
 <p className="text-muted-foreground">Gestiona usuarios, roles y asignacion de sectores.</p>
 </div>
 <InviteUserDialog sectors={sectors} />
 </div>

 {errorMsg && (
 <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
 Error: {errorMsg}
 </div>
 )}

 <UsersList users={users} sectors={sectors} />
 </div>
 )
}
