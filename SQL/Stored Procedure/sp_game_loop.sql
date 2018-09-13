CREATE PROCEDURE `sp_game_loop` ()
BEGIN
	UPDATE tbl_user
    SET gold = gold + 1,
		wood = wood + 1,
        food = food + 1,
        population = population + 1
	WHERE active = 1;
    COMMIT;
END
