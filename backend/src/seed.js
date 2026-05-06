/**
 * Database Seeder for Java
 * Run: node src/seed.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const problems = [
  {
    title: 'Two Sum',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers that add up to \`target\`.

**Example:**
- Input: 
  \`4\` (array length)
  \`2 7 11 15\` (array elements)
  \`9\` (target)
- Output: \`[0, 1]\`

**Constraints:**
- Each input has exactly one solution
- You may not use the same element twice`,
    difficulty: 'Easy',
    functionName: 'Main',
    starterCode: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = scanner.nextInt();
        }
        int target = scanner.nextInt();
        
        Solution sol = new Solution();
        int[] result = sol.twoSum(nums, target);
        System.out.println("[" + result[0] + ", " + result[1] + "]");
    }
}

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your logic here
        
        return new int[]{0, 0};
    }
}
`,
    testCases: JSON.stringify([
      { input: '4\n2 7 11 15\n9\n', output: '[0, 1]' },
      { input: '3\n3 2 4\n6\n', output: '[1, 2]' },
      { input: '2\n3 3\n6\n', output: '[0, 1]' },
    ]),
  },
  {
    title: 'Reverse String',
    description: `Write a function that reverses a string. 

**Example:**
- Input: \`hello\`
- Output: \`olleh\`
`,
    difficulty: 'Easy',
    functionName: 'Main',
    starterCode: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextLine()) return;
        String s = scanner.nextLine();
        
        Solution sol = new Solution();
        System.out.println(sol.reverseString(s));
    }
}

class Solution {
    public String reverseString(String s) {
        // Write your logic here
        
        return s;
    }
}
`,
    testCases: JSON.stringify([
      { input: 'hello\n', output: 'olleh' },
      { input: 'world\n', output: 'dlrow' },
      { input: 'racecar\n', output: 'racecar' },
    ]),
  },
  {
    title: 'Fibonacci Number',
    description: `Given \`n\`, return the \`n\`-th Fibonacci number.

F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2)

**Example:**
- Input: \`10\`
- Output: \`55\`
`,
    difficulty: 'Medium',
    functionName: 'Main',
    starterCode: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        
        Solution sol = new Solution();
        System.out.println(sol.fib(n));
    }
}

class Solution {
    public int fib(int n) {
        // Write your logic here
        
        return 0;
    }
}
`,
    testCases: JSON.stringify([
      { input: '0\n', output: '0' },
      { input: '1\n', output: '1' },
      { input: '10\n', output: '55' },
      { input: '15\n', output: '610' },
    ]),
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash('sanjai28%$#@', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@codehunt.com' },
    update: {
      password: adminPassword,
      name: 'Sanjai Admin',
    },
    create: {
      email: 'admin@codehunt.com',
      password: adminPassword,
      name: 'Sanjai Admin',
      role: 'admin',
    },
  });
  console.log('✅ Admin created:', admin.email);

  const studentPassword = await bcrypt.hash('student123', 10);
  const student = await prisma.user.upsert({
    where: { email: 'student@codehunt.com' },
    update: {},
    create: {
      email: 'student@codehunt.com',
      password: studentPassword,
      name: 'Demo Student',
      role: 'student',
    },
  });
  console.log('✅ Student created:', student.email);

  for (const p of problems) {
    const existing = await prisma.problem.findFirst({ where: { title: p.title } });
    if (!existing) {
      await prisma.problem.create({ data: p });
      console.log('✅ Problem created:', p.title);
    } else {
      console.log('⏭️  Problem already exists:', p.title);
    }
  }

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
