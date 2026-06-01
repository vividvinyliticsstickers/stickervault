import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  const selfEdit = (session.user as any).id === params.id

  // Only admins can edit other users; anyone can update their own basic info
  if (role !== 'ADMIN' && !selfEdit) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { password, role: newRole, ...rest } = body

    const updateData: any = { ...rest }

    // Only admins can change roles
    if (newRole && role === 'ADMIN') updateData.role = newRole

    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })

    return NextResponse.json(user)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent self-deletion
  if ((session.user as any).id === params.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  try {
    // Soft delete — deactivate instead
    await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
