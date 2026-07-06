import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 创建默认管理员
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!existing) {
    const hash = await bcrypt.hash('admin123', 10)
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: hash,
        role: 'admin',
        permittedChannels: null,
      },
    })
    console.log('Seeded admin user: admin / admin123')
  } else {
    console.log('Admin user already exists, skipping seed.')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
