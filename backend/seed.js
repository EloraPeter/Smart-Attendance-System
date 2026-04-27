import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function seed() {
  try {
    // 🔐 Login as SUPER ADMIN (dashboard admin)
    await pb.admins.authWithPassword('admin@system.com', 'admin123456');
    console.log("✅ Admin authenticated");

    // =========================
    // 👤 USERS
    // =========================

    // Lecturer
    const lecturer = await pb.collection('users').create({
      email: "lecturer@demo.com",
      password: "lecturer123",
      passwordConfirm: "lecturer123",
      name: "Dr. John Smith",
      role: "lecturer"
    });

    console.log("✅ Lecturer created:", lecturer.id);

    // App Admin (not dashboard admin)
    const appAdmin = await pb.collection('users').create({
      email: "admin@demo.com",
      password: "admin123",
      passwordConfirm: "admin123",
      name: "System Admin",
      role: "admin"
    });

    console.log("✅ App Admin created");

    // =========================
    // 🎓 STUDENTS
    // =========================

    const studentsData = [
      {
        matric_number: "UDA/2020/001",
        full_name: "Alice Johnson",
        department: "Computer Science",
        level: "400",
        email: "alice@student.edu",
        phone: "08012345678"
      },
      {
        matric_number: "UDA/2020/002",
        full_name: "Bob Williams",
        department: "Computer Science",
        level: "400"
      },
      {
        matric_number: "UDA/2020/003",
        full_name: "Carol Brown",
        department: "Computer Science",
        level: "400"
      },
      {
        matric_number: "UDA/2020/004",
        full_name: "David Lee",
        department: "Computer Science",
        level: "400"
      },
      {
        matric_number: "UDA/2020/005",
        full_name: "Emma Davis",
        department: "Computer Science",
        level: "400"
      }
    ];

    const createdStudents = [];

    for (const s of studentsData) {
      const student = await pb.collection('students').create(s);
      createdStudents.push(student);
    }

    console.log("✅ Students created:", createdStudents.length);

    // =========================
    // 📚 COURSES
    // =========================

    const coursesData = [
      {
        course_code: "CSC 401",
        title: "Software Engineering",
        unit: 3,
        lecturer: lecturer.id
      },
      {
        course_code: "CSC 402",
        title: "Database Systems",
        unit: 3,
        lecturer: lecturer.id
      }
    ];

    for (const c of coursesData) {
      await pb.collection('courses').create(c);
    }

    console.log("✅ Courses created");

    console.log("🎉 SEEDING COMPLETE");

  } catch (err) {
    console.error("❌ Error:", err);
  }
}

seed();