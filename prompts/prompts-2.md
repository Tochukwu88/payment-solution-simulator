# Prompts (part 2)

## 007 — 2026-08-01

the following set of instructions should be in another prompt file, we are building a payment procession simulation so we are gonna keep things simple first i want you to create a transaction class in the entities folder and these fields

```
Table transactions {
  id string

  reference string
  type string
  status will be an enum create trnasactionStatus enum, pending,failed completed etc

  description text

  idempotency_hash string

  amount number

  metadata jsonb

  created_at date
  updated_at date
}
```

## 008 — 2026-08-01

i need you to create a transaction repository interface that has three method create,findById and update , the update will only update the status

## 009 — 2026-08-01

next i want you to wrtie an inMemory transaction respository that implements the transaction respository, we are going to use a hash table for our storage, so in the constructor you will a Map to store transactions and also another Map to index idempotency key, you should also add another field to repository interface findByIdempotencyKey that looks up the indempotency index gets the transaction id and looks up the tansaction, when storing and retrieving do not store the transaction Object reference but create a copy

## 010 — 2026-08-01

under services folder create a transaction service that depends on the transactionRepository and app logger create 3 empty methods for now createPayment, retrievePayment and updatePayment

## 011 — 2026-08-01

i have installed jest , and created a folder called tests i want you to come up with reasonable test cases for the transaction service and write the test also same for the inmemory transaction repository for example an error should be try creating a payment twice with the same reference it should create the first transaction and return the transaction details created from the first on the second retry , basically there should not be double transaction with the same refrence
