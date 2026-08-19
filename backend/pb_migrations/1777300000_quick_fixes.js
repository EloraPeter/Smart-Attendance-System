/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1) Lock down user creation. Previously any authenticated user (e.g. a
  //    lecturer) could call the API and create a new user record, including
  //    one with role "admin" — a privilege escalation hole. New accounts
  //    should only be created by a superuser (dashboard/seed script), which
  //    always bypasses this rule anyway.
  const users = app.findCollectionByNameOrId("pbc_1377172174")
  unmarshal({
    "createRule": null
  }, users)
  app.save(users)

  // 2) Let a lecturer fix their own mistakes on attendance they marked,
  //    instead of only an admin being able to update/delete records.
  //    Admin retains full access.
  const attendance = app.findCollectionByNameOrId("pbc_2471705857")
  unmarshal({
    "updateRule": "@request.auth.role = \"admin\" || (@request.auth.role = \"lecturer\" && @request.auth.id = lecturer)",
    "deleteRule": "@request.auth.role = \"admin\" || (@request.auth.role = \"lecturer\" && @request.auth.id = lecturer)"
  }, attendance)
  attendance.indexes.push(
    "CREATE UNIQUE INDEX `idx_attendance_unique` ON `attendance` (`student`, `course`, `date`)"
  )
  app.save(attendance)

  // 3) Prevent duplicate enrollments (same student enrolled twice in the
  //    same course).
  const enrollments = app.findCollectionByNameOrId("pbc_3533380876")
  enrollments.indexes.push(
    "CREATE UNIQUE INDEX `idx_enrollment_unique` ON `course_enrollments` (`student`, `course`)"
  )
  app.save(enrollments)

  return
}, (app) => {
  const users = app.findCollectionByNameOrId("pbc_1377172174")
  unmarshal({
    "createRule": "@request.auth.id != \"\""
  }, users)
  app.save(users)

  const attendance = app.findCollectionByNameOrId("pbc_2471705857")
  unmarshal({
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  }, attendance)
  attendance.indexes = attendance.indexes.filter(
    (idx) => !idx.includes("idx_attendance_unique")
  )
  app.save(attendance)

  const enrollments = app.findCollectionByNameOrId("pbc_3533380876")
  enrollments.indexes = enrollments.indexes.filter(
    (idx) => !idx.includes("idx_enrollment_unique")
  )
  app.save(enrollments)
})
