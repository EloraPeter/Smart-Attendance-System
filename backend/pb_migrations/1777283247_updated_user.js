/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1377172174")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_ckhx8kcu4z` ON `users` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_email_ckhx8kcu4z` ON `users` (`email`) WHERE `email` != ''"
    ],
    "name": "users"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1377172174")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_tokenKey_ckhx8kcu4z` ON `user` (`tokenKey`)",
      "CREATE UNIQUE INDEX `idx_email_ckhx8kcu4z` ON `user` (`email`) WHERE `email` != ''"
    ],
    "name": "user"
  }, collection)

  return app.save(collection)
})
