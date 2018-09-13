CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_build_city`(IN i_username varchar(255), 
    IN i_x_coord int, 
    IN i_y_coord int)
BEGIN
	DECLARE user_can_build INT DEFAULT 0;
    DECLARE city_exists INT DEFAULT 0;
    
    SELECT 1 INTO user_can_build
    FROM tbl_user
    WHERE username = i_username
		AND wood >= 500
        AND food >= 500
        AND gold >= 500
	;
    
    IF user_can_build = 1 THEN
		UPDATE tbl_user 
		SET wood = wood - 500,
			food = food - 500,
			gold = gold - 500
		WHERE username = i_username
		;
    END IF;
    
    SELECT 1 INTO city_exists
    FROM tbl_city
    WHERE x_coord = i_x_coord
		AND y_coord = i_y_coord
	;
    
    IF city_exists <> 1 THEN
		INSERT INTO tbl_city(owner_id, x_coord, y_coord)
		SELECT user_id, i_x_coord, i_y_coord 
		FROM tbl_user 
		WHERE username = i_username;
	END IF;
    
    COMMIT;
END