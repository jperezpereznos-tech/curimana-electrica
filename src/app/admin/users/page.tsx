import { getUsersWithRolesAction } from './actions'
import { UsersList } from './users-list'
import { InviteUserDialog } from './invite-user-dialog'

export default async function UsersPage() {
  let users: any[] = []
  let sectors: any[] = []

  try {
    const data = await getUsersWithRolesAction()
    users = data.users
    sectors = data.sectors
  } catch {}

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Usuarios</h2>
          <p className="text-muted-foreground">Gestiona usuarios, roles y asignacion de sectores.</p>
        </div>
        <InviteUserDialog sectors={sectors} />
      </div>

      <UsersList users={users} sectors={sectors} />
    </div>
  )
}
