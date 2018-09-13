CREATE DEFINER=`root`@`localhost` FUNCTION `fn_build_city`(i_username varchar(255), 
    i_x_coord int, 
    i_y_coord int) RETURNS int(11)
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
    
    SELECT 1 INTO city_exists
    FROM tbl_city
    WHERE x_coord = i_x_coord
		AND y_coord = i_y_coord
	;
    
    IF user_can_build <> 1 THEN
		RETURN 1;
    END IF;
    
    
    IF city_exists = 1 THEN
		RETURN 2;
	END IF;
    
    /* If we made it this far we can build */
    UPDATE tbl_user 
	SET wood = wood - 500,
		food = food - 500,
		gold = gold - 500
	WHERE username = i_username
	;
	
	INSERT INTO tbl_city(owner_id, x_coord, y_coord)
	SELECT user_id, i_x_coord, i_y_coord 
	FROM tbl_user 
	WHERE username = i_username;
    
    RETURN 0;
END