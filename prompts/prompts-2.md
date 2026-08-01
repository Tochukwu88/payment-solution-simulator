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

## 012 — 2026-08-01

create a function that creates an idempotency hash using the sha-256 algorithm the function can accept a number of inputs

## 013 — 2026-08-01

i want you to create DTOS to create and update transactions apply validation on the DTOs and throw descriptive error responses with the approriate status code , then add the dtos to the create and update method in transaction service

## 014 — 2026-08-01

so next we need to build the createPayment method,after validation, compute an indepotency hash with the dto,then we need to find a transaction by reference, which is the idempotency key, if that transaction exists compare the hash of the existing transaction with the new one, if they are not the same throw an error message else return the transaction details to the client, validatae the amount is greater than 0 else throw an error , save the transaction in a pending state and return the saved transaction, wrap the logic in a try and catch block and return an internal server error in the catch block

## 015 — 2026-08-01

now the update method , i want you to add a status transition validation on statuses basically if something is failed it can not be moved to completed or pending, a completed transaction can be reversed etc

## 016 — 2026-08-01

now create the controllers and routes to createPayment,retrievePayment and updatePayment the controller will depend on the service , also for the response to the client use the response function we have created earlier

## 017 — 2026-08-01

create a mapper that strips the idempotency hash when returning transaction to the user
